import { create, encode, decode } from '../base.js'
import * as Block from 'multiformats/block'
import * as codec from 'multiformats/codecs/json'
import { sha256 as hasher } from 'multiformats/hashes/sha2'
import { PassThrough } from 'stream'

const toBlock = value => Block.encode({ value, codec, hasher })

let passes = 0

const testGetBlockClient = async () => {
  const block = await toBlock({ hello: 'world' })
  const iter = new PassThrough()
  const onGetBlock = cid => {
    if (!cid.equals(block.cid)) throw new Error('cids do not match')
    passes += 1 
    sendBlock(block)
  }
  const write = async msg => {
    passes += 1
    iter.write(msg)
  }
  const { sendBlock, getBlock } = create(iter, write, { onGetBlock })

  const _block = await getBlock(block.cid)
  if (!_block.cid.equals(block.cid)) throw new Error('cids do not match')
  passes += 1
}
 
testGetBlockClient()

process.on('exit', () => {
  if (passes !== 4) throw new Error('not enough pases')
})
