const PinStatusMap = {
  undefined: 'Undefined',
  cluster_error: 'ClusterError',
  pin_error: 'PinError',
  unpin_error: 'UnpinError',
  pinned: 'Pinned',
  pinning: 'Pinning',
  unpinning: 'Unpinning',
  unpinned: 'Unpinned',
  remote: 'Remote',
  pin_queued: 'PinQueued',
  unpin_queued: 'UnpinQueued',
  sharded: 'Sharded'
}

/**
 * Converts from cluster status string to DB pin status enum string.
 * @param {import('@nftstorage/ipfs-cluster').TrackerStatus} trackerStatus
 */
export function toPinStatusEnum (trackerStatus) {
  if (typeof trackerStatus !== 'string') {
    throw new Error(`invalid tracker status: ${trackerStatus}`)
  }
  const status = PinStatusMap[trackerStatus]
  if (!status) {
    throw new Error(`unknown tracker status: ${trackerStatus}`)
  }
  return status
}
