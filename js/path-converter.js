'use strict';

(function exposePathConverter(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.PathConverter = api;
  }
})(typeof window === 'undefined' ? null : window, () => {
  function windowsToMac(value, userName = '') {
    const match = /^\\\\([^\\]+)\\([^\\]+)(?:\\(.*))?$/.exec(value);
    if (!match) {
      return null;
    }

    const [, server, share, remainder = ''] = match;
    const userPrefix = userName ? `${encodeURIComponent(userName)}@` : '';
    const mountURI = `smb://${userPrefix}${server}/${encodeURIComponent(share)}`;
    const suffix = remainder ? `/${remainder.split('\\').join('/')}` : '';
    return {
      mountURI,
      macPath: `/Volumes/${share}${suffix}`,
    };
  }

  function macToWindows(value, mountSource) {
    const mountPoint = volumeMountPoint(value);
    const sourceMatch = /^\/\/(?:[^@/]+@)?([^/]+)\/([^/]+)$/.exec(mountSource || '');
    if (!mountPoint || !sourceMatch) {
      return null;
    }

    const [, server, encodedShare] = sourceMatch;
    let share = encodedShare;
    try {
      share = decodeURIComponent(encodedShare);
    } catch {
      // Mount output can contain a literal percent sign.
    }
    const remainder = value.slice(mountPoint.length).replace(/^\/+/, '');
    const suffix = remainder ? `\\${remainder.split('/').join('\\')}` : '';
    return {
      mountURI: `smb://${mountSource.slice(2)}`,
      windowsPath: `\\\\${server}\\${share}${suffix}`,
    };
  }

  function volumeMountPoint(value) {
    if (typeof value !== 'string') {
      return null;
    }
    const match = /^\/Volumes\/([^/]+)(?:\/|$)/.exec(value);
    return match ? `/Volumes/${match[1]}` : null;
  }

  function decodeMountPath(value) {
    return value.replace(/\\([0-7]{3})/g, (_match, octal) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    );
  }

  return { decodeMountPath, macToWindows, volumeMountPoint, windowsToMac };
});
