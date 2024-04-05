const axios = require('axios')
// const getAppData = require('../../lib/store-api/get-app-data')
const {
  topicResourceToEcom
} = require('../../lib/utils-variables')
// const Horus = require('../../lib/horus/client')
const requestHorus = require('../../lib/horus/request')
const { sendMessageTopic } = require('../../lib/pub-sub/utils')

const requestStoreApi = axios.create({
  baseURL: 'https://api.e-com.plus/v1',
  headers: {
    'Content-Type': 'application/json'
  }
})

const getAndSendProdcutToQueue = async (horus, storeId, query, opts) => {
  let hasRepeat = true
  let offset = 0
  const limit = 100

  let total = 0
  const promisesSendTopics = []
  while (hasRepeat) {
    // create Object Horus to request api Horus
    const endpoint = `/Busca_Acervo${query}&offset=${offset}&limit=${limit}`
    const products = await requestHorus(horus, endpoint, 'get')
      .catch((err) => {
        if (err.response) {
          console.warn(JSON.stringify(err.response))
        } else {
          console.error(err)
        }
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
  console.log('>> ', JSON.stringify(headers))
  requestStoreApi.get(url, {
    headers: {
      'x-store-id': headers['x-store-id'],
      'x-my-id': headers['x-my-id'],
      'x-access-token': headers['x-access-token']
    }
  })
    .then(({ response }) => {
      // const opts = { appData }
      console.log('>> ', response.data)
      res.send({ body })
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
