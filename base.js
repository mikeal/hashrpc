import { CID } from 'multiformats/cid'
import { decode, encodeTo, encodingLength } from './varint.js'
import { isBinary } from './bytes.js'

const fill = int => new Array(encodingLength(int)).fill(0)

const mkmsg = (i, cid, data) => {
  const cidLength = cid.bytes.byteLength
  const dataLength = data.byteLength
  const msg = new Uint8Array([
    i,
    ...fill(cidLength),
    ...fill(dataLength),
    ...cid.bytes,
    ...data
  ])
  encodeTo(cidLength, msg, 1)
  encodeTo(dataLength, msg, 1 + encodingLength(cidLength))
  return msg
}

const _dec = msg => {
  const [ code1, len1 ] = decode(msg, 1)
  const [ code2, len2 ] = decode(msg, 1 + len1)
  const i = 1 + len1 + len2
  const cid = CID.decode(msg.subarray(i, i + code1))
  const bytes = msg.subarray(i + code1)
  return { cid, bytes }
}

const parser = async (iter, { onGetBlock, onSendBlock, onControl }) => {
  const _getBlock = msg => {
    const [ len, l ] = decode(msg, 1)
    const cid = CID.decode(msg.subarray(1 + l))
    onGetBlock(cid)
  }
  const _sendBlock = msg => {
    onSendBlock(_dec(msg))
  }
  const _control = msg => {
    onControl(_dec(msg))
  }
  const responses = { '1': _getBlock, '2': _sendBlock, '3': _control }
  let _tail
  for await (let buff of iter) {
    const _parse = () => {
      const [ i ] = buff
      let length
      if (i === 1) {
        const [ code, len ] = decode(buff, 1)
        length = 1 + code + len
      } else if (i === 2 || i === 3) {
        const [ code1, len1 ] = decode(buff, 1)
        const [ code2, len2 ] = decode(buff, 1 + len1)
        length = 1 + code1 + len1 + code2 + len2
      } else {
        throw new Error('')
      }
      if (buff.byteLength === length) return responses[i](buff)
      else if (buff.byteLength > length) {
        responses[i](buff.subarray(0, length))
        buff = buff.subarray(length) 
        _parse()
      } else {
        _tail = buff
        throw new Error('Not Implemented')
      }
    }
    if (_tail) {
      throw new Error('Not Implemented')
    } else {
      _parse()
    }
  }
}

const encode = ( code, cid, data ) => {
  if (data) return mkmsg(code, cid, data)
  const msg = new Uint8Array([
    1,
    ...fill(cid.bytes.byteLength),
    ...cid.bytes
  ])
  encodeTo(cid.bytes.byteLength, msg, 1)
  return msg
}

const create = (iter, write, { onGetBlock, onSendBlock, onControl }) => {
  const sendBlock = ({cid, bytes}) => {
    return write(mkmsg(2, cid, bytes))
  }
  const sendControl = ({cid, bytes}) => {
    return write(mkmsg(3, cid, bytes))    
  }
  const registry = {}
  const getBlock = async cid => {
    const p = new Promise((resolve, reject) => {
      registry[cid.toString()] = [resolve, reject]
    })
    const msg = new Uint8Array([
      1,
      ...fill(cid.bytes.byteLength),
      ...cid.bytes
    ])
    encodeTo(cid.bytes.byteLength, msg, 1)
    await write(msg)
    return p
  }
  const _onSendBlock = ({ cid, bytes }) => {
    if (onSendBlock) onSendBlock({ cid, bytes })
    if (registry[cid.toString()]) {
      const [ resolve ] = registry[cid.toString()] 
      resolve({ cid, bytes })
      delete registry[cid.toString()]
    } else {
      if (!onSendBlock) throw new Error('Unhandled error')
    }
  }
  const _parser = parser(iter, { onGetBlock, onSendBlock: _onSendBlock, onControl })
  return { sendBlock, sendControl, getBlock, _parser }
}

export { create, encode, _dec as decode }
