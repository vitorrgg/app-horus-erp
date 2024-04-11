const axios = require('axios')
const { firestore } = require('firebase-admin')
const getAppData = require('../../lib/store-api/get-app-data')
const {
  topicResourceToEcom,
  collectionHorusEvents
} = require('../../lib/utils-variables')
const Horus = require('../../lib/horus/client')
const requestHorus = require('../../lib/horus/request')
const { sendMessageTopic } = require('../../lib/pub-sub/utils')
const { parseDate } = require('../../lib/parsers/parse-to-horus')

const requestStoreApi = axios.create({
  baseURL: 'https://api.e-com.plus/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

const saveFirestore = (idDoc, body) => firestore()
  .doc(idDoc)
  .set(body, { merge: true })
  .then(() => { console.log('Save in firestore') })
  .catch(console.error)

const getAndSendProdcutToQueue = async (horus, storeId, query, opts) => {
  let hasRepeat = true
  let offset = 0
  const limit = 50

  let total = 0
  const init = Date.now()
  const promisesSendTopics = []
  while (hasRepeat) {
    // create Object Horus to request api Horus
    const endpoint = `/Busca_Acervo${query}offset=${offset}&limit=${limit}`
    const products = await requestHorus(horus, endpoint, 'get', true)
      .catch((_err) => {
        // if (err.response) {
        //   console.warn(JSON.stringify(err.response?.data))
        // } else {
        //   console.error(err)
        // }
        return null
      })

    if (products && Array.isArray(products)) {
      total += products.length
      products.forEach((productHorus, index) => {
        promisesSendTopics.push(
          sendMessageTopic(
            topicResourceToEcom,
            {
              storeId,
              resource: 'products',
              objectHorus: productHorus,
              opts
            })
        )
      })
      const now = Date.now()
      const time = now - init
      if (time >= 20000) {
        hasRepeat = false
      }
    } else {
      hasRepeat = false
    }

    offset += limit
  }

  console.log(`>> import all #${storeId} [${query}] total imports ${total}`)
  return Promise.all(promisesSendTopics)
}

exports.post = async ({ appSdk }, req, res) => {
  const {
    headers,
    body
  } = req
  const url = '/authentications/me.json'

  requestStoreApi.get(url, {
    headers: {
      'x-store-id': headers['x-store-id'],
      'x-my-id': headers['x-my-id'],
      'x-access-token': headers['x-access-token']
    }
  })
    .then(({ data }) => data)

    .then(async (data) => {
      const storeId = data.store_id
      const auth = await appSdk.getAuth(storeId)
      const appData = await getAppData({ appSdk, storeId, auth }, true)

      const {
        username,
        password,
        baseURL
      } = appData

      const horus = new Horus(username, password, baseURL)
      const opts = { appData, isUpdateDate: false }

      let query = '?'
      if (body.cod_init || body.cod_end) {
        const codInit = body.cod_init || 1
        const codEnd = body.cod_end || (codInit + 100)
        query += `COD_ITEM_INI=${codInit}&COD_ITEM_FIM=${codEnd}&`
      } else if (body.date_init && body.date_end) {
        const now = new Date()
        const bodyDateIni = new Date(body.date_init)
        const bodyDateEnd = new Date(body.date_end)
        const dateIni = !Number.isNaN(bodyDateIni.getTime()) ? bodyDateIni : now
        const dateEnd = !Number.isNaN(bodyDateEnd.getTime()) ? bodyDateEnd : now

        query += `DATA_INI=${parseDate(dateIni)}&DATA_FIM=${parseDate(dateEnd)}&`
      }

      return getAndSendProdcutToQueue(horus, storeId, query, opts)
        .then(() => storeId)
    })
    .then((storeId) => {
      const docId = `${collectionHorusEvents}/${storeId}_products`
      const lastUpdateProducts = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // UTC-3
      const body = { lastUpdateProducts }
      return saveFirestore(docId, body)
    })
    .then(() => {
      // console.log('>> Finish send import Products')
      res.status(201)
        .send('Importing Products')
    })
    .catch(err => {
      let message = err.name
      let status = 400
      if (err.response) {
        status = err.response.status || status
        message = err.response.statusText || message
        console.error(err.response)
      } else {
        console.error(err)
      }

      res.status(status).send({
        statusCode: status,
        message
      })
    })
}
