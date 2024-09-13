'use server'
import payloadConfig from '@payload-config'
import { getPayloadHMR } from '@payloadcms/next/utilities'
import { getServerSideUser } from './payload-utils'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from './stripe'

export const createSession = async (data: any) => {
  let { productIds } = data
  const nextCookies = cookies()
  const { user } = await getServerSideUser(nextCookies)
  console.log('if user: ', user)
  if (productIds.length === 0) {
    return false
  }
  if (user) {
    const payload = await getPayloadHMR({ config: payloadConfig })

    const { docs: products } = await payload.find({
      collection: 'products',
      where: {
        id: {
          in: productIds,
        },
      },
    })

    const filteredProducts = products.filter((prod) => Boolean(prod.priceId))

    const order = await payload.create({
      collection: 'orders',
      data: {
        _isPaid: false,
        products: filteredProducts.map((prod) => prod.id),
        user: user.id,
      },
    })

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = []

    filteredProducts.forEach((product) => {
      line_items.push({
        price: product.priceId!,
        quantity: 1,
      })
    })

    line_items.push({
      price: 'price_1OMZrjCMpOG3MwjvYs22uQVj',
      quantity: 1,
      adjustable_quantity: {
        enabled: false,
      },
    })

    try {
      const stripeSession = await stripe.checkout.sessions.create({
        success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/thank-you?orderId=${order.id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/cart`,
        payment_method_types: ['card'],
        mode: 'payment',
        metadata: {
          userId: user.id,
          orderId: order.id,
        },
        line_items,
      })

      return { url: stripeSession.url }
    } catch (err) {
      console.log('ERRR: ', err)
      return { url: null }
    }
  }
}
