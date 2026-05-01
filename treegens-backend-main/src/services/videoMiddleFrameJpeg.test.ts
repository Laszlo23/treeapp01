import assert from 'node:assert/strict'
import test from 'node:test'
import { tempVideoSuffixFromHints } from './videoMiddleFrameJpeg'

test('tempVideoSuffixFromHints prefers filename extension', () => {
  assert.equal(
    tempVideoSuffixFromHints('clip.webm', 'video/mp4'),
    '.webm',
  )
  assert.equal(tempVideoSuffixFromHints('x.MP4'), '.mp4')
})

test('tempVideoSuffixFromHints falls back to content type', () => {
  assert.equal(tempVideoSuffixFromHints('blob', 'video/webm'), '.webm')
  assert.equal(
    tempVideoSuffixFromHints('', 'video/quicktime'),
    '.mov',
  )
})

test('tempVideoSuffixFromHints defaults to mp4', () => {
  assert.equal(tempVideoSuffixFromHints(), '.mp4')
})
