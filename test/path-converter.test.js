'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  decodeMountPath,
  macToWindows,
  volumeMountPoint,
  windowsToMac,
} = require('../js/path-converter');

test('converts a Windows UNC path without shell escaping', () => {
  assert.deepEqual(windowsToMac('\\\\server\\Shared Folder\\a b\\file.txt', 'a user'), {
    mountURI: 'smb://a%20user@server/Shared%20Folder',
    macPath: '/Volumes/Shared Folder/a b/file.txt',
  });
});

test('rejects non-UNC input', () => {
  assert.equal(windowsToMac('C:\\Users\\example'), null);
  assert.equal(windowsToMac('$(touch /tmp/unsafe)'), null);
});

test('converts a mounted SMB path back to Windows form', () => {
  assert.deepEqual(
    macToWindows('/Volumes/Shared Folder/a b/file.txt', '//a%20user@server/Shared%20Folder'),
    {
      mountURI: 'smb://a%20user@server/Shared%20Folder',
      windowsPath: '\\\\server\\Shared Folder\\a b\\file.txt',
    },
  );
});

test('recognizes only paths below /Volumes', () => {
  assert.equal(volumeMountPoint('/Volumes/share/folder'), '/Volumes/share');
  assert.equal(volumeMountPoint('/Applications/Calculator.app'), null);
  assert.equal(volumeMountPoint('/Volumes'), null);
});

test('decodes mount output octal escapes', () => {
  assert.equal(decodeMountPath('/Volumes/Shared\\040Folder'), '/Volumes/Shared Folder');
});
