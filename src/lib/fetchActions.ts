'use server'

import payloadConfig from '@payload-config'
import { getPayloadHMR } from '@payloadcms/next/utilities'
import axios from 'axios'
export const getProducts = async () => {
  const response = await axios(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/approvedProducts`)
  return response.data
}

export const createPayloadUser = async ({
  email,
  password,
}: {
  email: string
  password: string
}) => {
  const payload = await getPayloadHMR({ config: payloadConfig })
  // check if user exist
  const { docs: users } = await payload.find({
    collection: 'users',
    where: {
      email: {
        equals: email,
      },
    },
  })
  if (users.length !== 0) throw new Error('CONFILCT')
  await payload.create({
    collection: 'users',
    data: {
      email,
      password,
      role: 'user',
    },
  })
  return { success: true, sentToEmail: email }
}

export const verifyEmail = async (token: string) => {
  const payload = await getPayloadHMR({ config: payloadConfig })

  const isVerified = await payload.verifyEmail({
    collection: 'users',
    token,
  })

  if (!isVerified) throw new Error('UNAUTHORIZED')

  return { success: true }
}
