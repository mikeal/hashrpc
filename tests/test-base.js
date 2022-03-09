import { create, encode, decode } from '../base.js'
import * as Block from 'multiformats/block'
import * as codec from 'multiformats/codecs/json'
import { sha256 as hasher } from 'multiformats/hashes/sha2'

const toBlock = value => Block.encode({ value, codec, hasher })

const createIter = async function * (writes) {
  for (const write of writes) {
    yield write
  }
}

let passes = 0

const testGetBlockService = async () => {
  const block = await toBlock({ hello: 'world' })
  const iter = createIter([ encode(1, block.cid) ])
  const onGetBlock = cid => {
    if (!cid.equals(block.cid)) throw new Error('cids do not match')
    passes += 1 
    sendBlock(block)
  }
  const write = async msg => {
    const _block = await Block.create({ codec, hasher, ...decode(msg) })
    if (!_block.cid.equals(block.cid)) throw new Error('cids do not match')
    passes += 1
  }
  const { sendBlock } = create(iter, write, { onGetBlock })
}

testGetBlockService()

process.on('exit', () => {
  if (passes !== 2) throw new Error('not enough passes')
})
