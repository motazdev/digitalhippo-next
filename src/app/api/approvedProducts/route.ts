import { getPayloadHMR } from '@payloadcms/next/utilities'
import { NextRequest, NextResponse } from 'next/server'
import configPromise from '@payload-config'
import { TQueryValidator } from '@/lib/validators/query-validator'
interface query {
  limit?: number
  cursor?: number
  query?: TQueryValidator
}
export const GET = async (req: NextRequest, res: NextResponse) => {
  const payload = await getPayloadHMR({
    config: configPromise,
  })
  const query: query = Object.fromEntries(req.nextUrl.searchParams)
  const page = query.cursor || 1
  const queryOpts = query.query

  const {
    docs: items,
    hasNextPage,
    hasPrevPage,
    nextPage,
  } = await payload.find({
    collection: 'products',
    where: {
      approvedForSale: {
        equals: 'approved',
      },
    },
    limit: query.limit,
    sort: 'asc',
    page,
    depth: 1,
  })

  return Response.json({ items, nextPage: hasNextPage ? nextPage : null })
}
