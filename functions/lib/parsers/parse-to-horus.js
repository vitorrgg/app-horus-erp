const parseDate = (date = new Date(), isComplete) => {
  const day = date.getDate()
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  let format = `${day < 10 ? `0${day}` : day}`
  format += `/${month < 10 ? `0${month}` : month}/${year}`

  if (isComplete) {
    const hours = date.getHours()
    const minutes = date.getMinutes()
    const seconds = date.getSeconds()

    format += ` ${hours < 10 ? `0${hours}` : hours}`
    format += `:${minutes < 10 ? `0${minutes}` : minutes}`
    format += `:${seconds < 10 ? `0${seconds}` : seconds}`
  }
  return format
}

const parseFinancialStatus = (status) => {
  if (status) {
    switch (status) {
      case 'authorized':
        return 'LAP' // Liberado para aprovação
      case 'paid':
        return 'LEX' // Liberado para expedição
      default:
        return 'NOV' // Pedido Novo
    }
  }
  return 'NOV' // Pedido Novo
}

const parsePaymentMethod = (paymentMethod) => {
  // credit_card · banking_billet · online_debit · account_deposit · debit_card · balance_on_intermediary · loyalty_points · other
  switch (paymentMethod) {
    case 'credit_card':
      return 'Cartão de Crédito'
    case 'banking_billet':
      return 'Boleto'
    case 'account_deposit':
      return 'Pix'
    case 'debit_card':
      return 'Cartão Débito'
    case 'loyalty_points':
      return 'Programa de Pontos'
    default:
      return null
  }
}

const getCodePayment = (paymentMethod, appDataOrders) => {
  if (!appDataOrders.payments?.length || !paymentMethod) {
    return 1
  }
  const methodName = parsePaymentMethod(paymentMethod)
  if (!methodName) {
    return 1
  }

  const method = appDataOrders.payments
    .find(payment => payment.name === methodName)

  return method ? method.code : 1
}

const parsePrice = (value) => value
  .toFixed(2)
  // .replace('.', ',')

module.exports = {
  parseDate,
  parsePrice,
  parseFinancialStatus,
  getCodePayment
}