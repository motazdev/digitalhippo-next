import { Access, CollectionConfig } from 'payload'
import { PrimaryActionEmailHtml } from '../components/emails/PrimaryActionEmail'
import { User } from 'payload-types'

const adminsAndUser: Access = ({ req: { user } }) => {
  if (user?.role === 'admin') return true

  return {
    id: {
      equals: user?.id,
    },
  }
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    verify: {
      generateEmailHTML: ({ token }) => {
        return PrimaryActionEmailHtml({
          actionLabel: 'Verify your account',
          buttonText: 'Verify Account',
          href: `${process.env.NEXT_PUBLIC_SERVER_URL}/verify-email?token=${token}`,
        })
      },
    },
  },
  access: {
    read: adminsAndUser,
    create: () => true,
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  admin: {
    hidden: true,
    defaultColumns: ['id'],
  },

  fields: [
    {
      name: 'products',
      label: 'Products',
      admin: {
        condition: () => false,
      },
      type: 'relationship',
      relationTo: 'products',
      hasMany: true,
    },
    {
      name: 'product_files',
      label: 'Product files',
      admin: {
        condition: () => false,
      },
      type: 'relationship',
      relationTo: 'product_files',
      hasMany: true,
    },
    {
      name: 'role',
      required: true,
      defaultValue: 'user',
      type: 'select',
      options: [
        {
          label: 'Admin', // user will read
          value: 'admin', // not readable (for us only)
        },
        {
          label: 'User',
          value: 'user',
        },
      ],
    },
  ],
}
