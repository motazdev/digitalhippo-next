import path from 'path'
// import { postgresAdapter } from '@payloadcms/db-postgres'
import { PRODUCT_CATEGORIES } from '@/config'
import { stripe } from '@/lib/stripe'
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import {
  AfterChangeHook,
  BeforeChangeHook,
} from 'node_modules/payload/dist/collections/config/types'
import { Access, buildConfig } from 'payload'
import { Product, User } from 'payload-types'
import { en } from 'payload/i18n/en'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import { PrimaryActionEmailHtml } from './src/components/emails/PrimaryActionEmail'
import { Media } from '@/collections/Media'
import { Users } from '@/collections/Users'
import { Products } from '@/collections/Products/Products'
import { ProductFile } from '@/collections/ProductFile'
import { Orders } from '@/collections/Orders'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const adminsAndUser: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true

  return {
    id: {
      equals: user?.id,
    },
  }
}

///////////
const syncUser: AfterChangeHook<Product> = async ({ req, doc }) => {
  const fullUser = await req.payload.findByID({
    collection: 'users',
    id: req.user?.id ?? 0,
  })

  if (fullUser && typeof fullUser === 'object') {
    const { products } = fullUser
    const allIDs = [
      ...(products?.map((product) => (typeof product === 'object' ? product.id : product)) || []),
    ]

    const createdProductdIDs = allIDs.filter((id, index) => allIDs.indexOf(id) === index)

    const dataToUpdate = [...createdProductdIDs, doc.id]

    await req.payload.update({
      collection: 'users',
      id: fullUser.id,
      data: {
        products: dataToUpdate,
      },
    })
  }
}

const isAdminOrHasAccess =
  (): Access =>
  ({ req: { user: _user } }) => {
    const user = _user as User | undefined
    if (!user) return false
    if (user.role === 'admin') return true
    const userProductIDs = (user.products || []).reduce<Array<string>>((acc, product) => {
      if (!product) return acc
      if (typeof product === 'string') {
        acc.push(product)
      } else {
        acc.push(product.id)
      }
      return acc
    }, [])

    return {
      id: {
        in: userProductIDs,
      },
    }
  }

// products
const addUserProducts: BeforeChangeHook<Product> = async ({ req, data }) => {
  const user = req.user
  return {
    ...data,
    user: user?.id,
  }
}

const syncUserProducts: AfterChangeHook<Product> = async ({ req, doc }) => {
  const fullUser = await req.payload.findByID({
    collection: 'users',
    id: req.user?.id ?? 0,
  })

  if (fullUser && typeof fullUser === 'object') {
    const { products } = fullUser
    const allIDs = [
      ...(products?.map((product) => (typeof product === 'object' ? product.id : product)) || []),
    ]

    const createdProductdIDs = allIDs.filter((id, index) => allIDs.indexOf(id) === index)

    const dataToUpdate = [...createdProductdIDs, doc.id]

    await req.payload.update({
      collection: 'users',
      id: fullUser.id,
      data: {
        products: dataToUpdate,
      },
    })
  }
}

// productFiles
const addUser: BeforeChangeHook = ({ req, data }) => {
  const user = req.user as User | null
  return { ...data, user: user?.id }
}
const yourOwnAndPurchased: Access = async ({ req }) => {
  const user = req.user as User | null
  if (user?.role === 'admin') return true

  if (!user) return false

  const { docs: products } = await req.payload.find({
    collection: 'products',
    depth: 0,
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  const ownProductFileIds = products.map((prod) => prod.product_files).flat()

  const { docs: orders } = await req.payload.find({
    collection: 'orders',
    depth: 2, // join tables together
    where: {
      user: {
        equals: user.id,
      },
    },
  })

  const purchasedProductFileIds = orders
    .map((order) => {
      return order.products.map((product) => {
        if (typeof product === 'string')
          return req.payload.logger.error('Search depth not sufficient to find purchased file IDs')

        return typeof product.product_files === 'string'
          ? product.product_files
          : product.product_files.id
      })
    })
    .filter(Boolean) // to take out all undefined values from the array
    .flat()

  return {
    id: {
      in: [...ownProductFileIds, ...purchasedProductFileIds],
    },
  }
}

// orders
const yourOwn: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true
  return {
    user: {
      equals: user?.id, // read my own orders
    },
  }
}

// media
const isAdminOrHasAccessToImages =
  (): Access =>
  async ({ req }) => {
    const user = req.user as User | undefined

    if (!user) return false
    if (user.role === 'admin') return true
    return {
      user: {
        equals: req.user?.id,
      },
    }
  }

////////////////
export default buildConfig({
  //editor: slateEditor({}),
  editor: lexicalEditor(),
  collections: [Users, Products, Media, ProductFile, Orders],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  csrf: ['localhost', '127.0.0.1'],
  // db: postgresAdapter({
  //   pool: {
  //     connectionString: process.env.POSTGRES_URI || ''
  //   }
  // }),
  db: mongooseAdapter({
    url: process.env.MONGODB_URI || '',
  }),

  /**
   * Payload can now accept specific translations from 'payload/i18n/en'
   * This is completely optional and will default to English if not provided
   */
  i18n: {
    supportedLanguages: { en },
  },
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || '',

  admin: {
    autoLogin: {
      email: 'motaz13essam@gmail.com',
      password: '22997711',
      prefillOnly: true,
    },
  },
  async onInit(payload) {
    const existingUsers = await payload.find({
      collection: 'users',
      limit: 1,
    })

    if (existingUsers.docs.length === 0) {
      await payload.create({
        collection: 'users',
        data: {
          email: 'motaz13essam@gmail.com',
          password: '22997711',
          role: 'user',
        },
      })
    }
  },
  // Sharp is now an optional dependency -
  // if you want to resize images, crop, set focal point, etc.
  // make sure to install it and pass it to the config.

  // This is temporary - we may make an adapter pattern
  // for this before reaching 3.0 stable

  sharp,
})
