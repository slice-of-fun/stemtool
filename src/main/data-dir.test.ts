import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'path'
import { resolveDataDir } from './data-dir.ts'

const DEFAULT = '/home/user/.config/StemTool'

test('falls back to the electron default when unset', () => {
  assert.equal(resolveDataDir({}, DEFAULT), DEFAULT)
})

test('falls back when the override is blank', () => {
  assert.equal(resolveDataDir({ STEMTOOL_DATA_DIR: '   ' }, DEFAULT), DEFAULT)
})

test('uses the override folder when set', () => {
  assert.equal(
    resolveDataDir({ STEMTOOL_DATA_DIR: '/mnt/big/stemtool' }, DEFAULT),
    resolve('/mnt/big/stemtool')
  )
})

test('resolves a relative override to an absolute path', () => {
  assert.equal(resolveDataDir({ STEMTOOL_DATA_DIR: 'data' }, DEFAULT), resolve('data'))
})
