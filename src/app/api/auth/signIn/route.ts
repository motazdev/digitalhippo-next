import { getPayloadHMR } from '@payloadcms/next/utilities'
import { NextRequest, NextResponse } from 'next/server'
import configPromise from '@payload-config'
export const POST = async (req: NextRequest, res: NextResponse) => {
  const body = await req.json()
  const payload = await getPayloadHMR({ config: configPromise })
  try {
    await payload.login({
      collection: 'users',
      data: {
        email: body.email,
        password: body.password,
      },
    })
    return { success: true }
  } catch (error) {
    return NextResponse.json({ success: false, error }, { statusText: 'UNAUTHORIZED' })
  }
}
