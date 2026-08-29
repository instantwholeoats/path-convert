'use strict';

window.addEventListener('DOMContentLoaded', async () => {
  const windowsPath = document.getElementById('windowsPath');
  const mountURI = document.getElementById('mountURI');
  const macPath = document.getElementById('macPath');
  const userName = document.getElementById('userName');
  const openButton = document.getElementById('openButton');
  const status = document.getElementById('status');
  let conversionRequest = 0;

  function setStatus(message = '') {
    status.textContent = message;
  }

  function windowsPathInput() {
    const converted = window.PathConverter.windowsToMac(windowsPath.value, userName.value);
    if (!converted) {
      mountURI.value = '';
      macPath.value = '';
      setStatus(windowsPath.value ? 'Windowsパスの形式を確認してください。' : '');
      return;
    }
    mountURI.value = converted.mountURI;
    macPath.value = converted.macPath;
    setStatus();
  }

  async function macPathInput() {
    const request = ++conversionRequest;
    if (!window.PathConverter.volumeMountPoint(macPath.value)) {
      windowsPath.value = '';
      mountURI.value = '';
      setStatus(macPath.value ? '/Volumes 以下のパスを入力してください。' : '');
      return;
    }

    try {
      const source = await window.pathConvertApi.getMountSource(macPath.value);
      if (request !== conversionRequest) {
        return;
      }
      const converted = window.PathConverter.macToWindows(macPath.value, source);
      if (!converted) {
        windowsPath.value = '';
        mountURI.value = '';
        setStatus('対応するSMBマウントを確認できませんでした。');
        return;
      }
      windowsPath.value = converted.windowsPath;
      mountURI.value = converted.mountURI;
      setStatus();
    } catch (error) {
      setStatus(error.message);
    }
  }

  document.addEventListener('dragover', (event) => event.preventDefault());
  document.addEventListener('drop', (event) => {
    event.preventDefault();
    const [file] = event.dataTransfer.files;
    if (!file) {
      return;
    }
    macPath.value = window.pathConvertApi.getPathForFile(file);
    macPathInput();
  });

  macPath.addEventListener('change', macPathInput);
  windowsPath.addEventListener('input', windowsPathInput);
  userName.addEventListener('input', windowsPathInput);
  openButton.addEventListener('click', async () => {
    try {
      await window.pathConvertApi.openPath(macPath.value);
      setStatus();
    } catch (error) {
      setStatus(error.message);
    }
  });

  try {
    userName.value = await window.pathConvertApi.getUserName();
  } catch (error) {
    setStatus(error.message);
  }
});
