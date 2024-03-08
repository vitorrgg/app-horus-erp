const axios = require('axios')

exports.all = async ({ appSdk }, req, res) => {
  const { method, params, url, body } = req
  try {
    const urlRequest = params[0] + url.split(params[0])[1]
    const { data } = await axios[method.toLowerCase()](urlRequest, { body })
    res.send(data)
  } catch (e) {
    console.error(e)
    throw e
  }
}
