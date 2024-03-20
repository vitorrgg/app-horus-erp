module.exports = async ({ appSdk, storeId, auth }, brandHorus) => {
  // metafields.namespace='horus-erp'
  // metafields.field='COD_EDITORA' || autor
  // metafields.value=categoriesHorus.COD_EDITORA || autor

  const {
    codEditora,
    nomeEditora,
    nomeAutor
  } = brandHorus

  let endpoint = 'brands.json?metafields.namespace=horus-erp'
  if (codEditora) {
    endpoint += `&metafields.field=COD_EDITORA&metafields.value=${nomeEditora}`
  } else if (nomeAutor) {
    endpoint += `&metafields.field=NOME_AUTOR&metafields.value=${nomeAutor}`
  }
  endpoint += '&limit=1'

  if (codEditora || nomeAutor) {
    let data = await appSdk.apiRequest(storeId, endpoint, 'GET', null, auth)
      .then(({ response }) => response.data)
      .catch((err) => {
        if (err.response?.status === 404 || err.message === 'not found') {
          return null
        }
        if (err.response) {
          console.warn(JSON.stringify(err.response))
        } else {
          console.error(err)
        }
        throw err
      })

    if (data) {
      if (data.result && data.result.length) {
        return data.result[0]
      }
    }

    const body = {
      name: codEditora || nomeAutor,
      metafields: [
        {
          namespace: 'horus-erp',
          field: codEditora ? 'COD_EDITORA' : 'NOME_AUTOR',
          value: codEditora || nomeAutor
        }
      ]
    }

    endpoint = 'brands.json'
    data = await appSdk.apiRequest(storeId, endpoint, 'POST', body, auth)
      .then(({ response }) => response.data)
      .catch((err) => {
        console.error(err)
        return null
      })

    return data ? { _id: data._id, name: codEditora || nomeAutor } : data
  }
  return null
}
