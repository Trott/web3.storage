import React, { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { If, Then, Else, When } from 'react-if'
import clsx from 'clsx'

import countly from '../lib/countly'
import { deleteToken, getTokens } from '../lib/api'
import Button from '../components/button.js'
import Loading from '../components/loading.js'

/** @typedef {{ _id: string, name: string, secret: string, hasUploads?: boolean }} Token */

/**
 * @returns {{ props: import('../components/types.js').LayoutProps}}
 */
export function getStaticProps() {
  return {
    props: {
      title: 'Manage API Tokens - web3.storage',
      redirectTo: '/',
      needsUser: true,
    },
  }
}

/**
 * @param {Object} props
 * @param {Object} [props.children]
 */
const TableHeader = ({ children }) => (
  <th className="px-2 border-2 border-w3storage-red bg-w3storage-red-background">
    {children}
  </th>
)

/**
 * @param {Object} props
 * @param {Object} [props.children]
 * @param {number} [props.index]
 * @param {boolean} [props.checked]
 * @param {boolean} [props.breakAll]
 * @param {boolean} [props.centered]
 * @param {boolean} [props.important]
*/
const TableElement = ({ children, index = 0, breakAll = true, centered, important }) => (
  <td
    className={clsx('px-2 border-2 border-w3storage-red',
      index % 2 === 0 ? 'bg-white' : 'bg-gray-100',
      breakAll && 'break-all',
      centered && 'text-center'
    )}
    style={{ minWidth: important ? 150 : 0 }}
  >
    {children}
  </td>
)

/**
 * @param {Object} props
 * @param {Token} props.token
 * @param {number} props.index
 * @param {string} props.copied
 * @param {(t: Token) => void} props.onCopy
 * @param {string} props.deleting
 * @param {(t: Token) => void} props.onDelete
 */
const TokenRow = ({ token, index, copied, onCopy, deleting, onDelete }) => {
  const sharedArgs = { index }
  return (
    <tr>
      <TableElement {...sharedArgs} important>{token.name}</TableElement>
      <TableElement {...sharedArgs} important>
        <code style={{ wordWrap: 'break-word' }}>{token.secret}</code>
      </TableElement>
      <TableElement {...sharedArgs} breakAll={false}>
        <form onSubmit={e => { e.preventDefault(); onCopy(token) }}>
          <Button type="submit" small className="w-28">
            {copied === token._id ? 'Copied!' : 'Copy'}
          </Button>
        </form>
      </TableElement>
      <TableElement {...sharedArgs} breakAll={false}>
        <form onSubmit={e => { e.preventDefault(); onDelete(token) }}>
          <Button type="submit" disabled={Boolean(deleting)} small>
            {deleting === token._id ? 'Deleting...' : 'Delete'}
          </Button>
        </form>
      </TableElement>
    </tr>
  )
}

/**
 *
 * @param {import('../components/types.js').LayoutChildrenProps} props
 * @returns
 */
export default function Tokens({ user }) {
  const [deleting, setDeleting] = useState('')
  const [copied, setCopied] = useState('')
  const queryClient = useQueryClient()
  const { isLoading, isFetching, data } = useQuery('get-tokens', getTokens, {
    enabled: !!user
  })
  /** @type Token[] */
  const tokens = data || []
  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(''), 5000)
    return () => clearTimeout(timer)
  }, [copied])

  /**
   * @param {Token} t
   */
  async function handleDeleteToken(t) {
    if (!confirm('Are you sure? Deleted tokens cannot be recovered!')) {
      return
    }

    setDeleting(t._id)

    try {
      await deleteToken(t._id)
    } finally {
      await queryClient.invalidateQueries('get-tokens')
      setDeleting('')

      countly.trackEvent(countly.events.TOKEN_DELETE, {
        ui: countly.ui.TOKENS,
      })
    }
  }

  /**
   * @param {Token} t
   */
  async function handleCopyToken(t) {
    await navigator.clipboard.writeText(t.secret)
    setCopied(t._id)

    countly.trackEvent(countly.events.TOKEN_COPY, {
      ui: countly.ui.TOKENS,
    })
  }

  return (
    <div className="layout-margins">
      <main className="max-w-screen-lg mx-auto my-4 lg:my-16 text-w3storage-purple">
        <h3>API Tokens</h3>
        <When condition={tokens.length > 0}>
          <div className="flex ml-6">
            <div className="w-35 ml-auto">
              <Button
                href="/new-token"
                small
                tracking={{ ui: countly.ui.TOKENS, action: 'New API Token' }}
              >New API Token</Button>
            </div>
          </div>
        </When>
        <If condition={isLoading || isFetching}>
          <Then>
            <Loading />
          </Then>
          <Else>
            <When condition={tokens.length > 0}>
              <table className="w-full mt-4">
                <thead>
                  <tr className="bb b--black">
                    <TableHeader>Name</TableHeader>
                    <TableHeader>Token</TableHeader>
                    <TableHeader />
                    <TableHeader />
                  </tr>
                </thead>
                <tbody>
                  {tokens.map((t, i) =>
                    <TokenRow 
                      key={t._id}
                      token={t}
                      index={i}
                      copied={copied}
                      onCopy={handleCopyToken}
                      deleting={deleting}
                      onDelete={handleDeleteToken}
                    />
                  )}
                </tbody>
              </table>
            </When>
            <When condition={tokens.length === 0}>
              <div className="flex flex-col items-center">
                <p className="font-black mt-10">
                  No API Tokens
                </p>
                <div className="w-35 mt-10">
                  <Button
                    href="/new-token"
                    small
                    tracking={{ ui: countly.ui.TOKENS_EMPTY, action: 'New API Token' }}
                  >New API Token</Button>
                </div>
              </div>
            </When>
          </Else>
        </If>
      </main>
    </div>
  )
}
