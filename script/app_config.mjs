import pakeJson from '../src-tauri/pake.json' with { type: 'json' };
import tauriJson from '../src-tauri/tauri.conf.json' with { type: 'json' };
import windowsJson from '../src-tauri/tauri.windows.conf.json' with { type: 'json' };
import macosJson from '../src-tauri/tauri.macos.conf.json' with { type: 'json' };
import linuxJson from '../src-tauri/tauri.linux.conf.json' with { type: 'json' };

import { writeFileSync, existsSync, copyFileSync } from 'fs';
import os from 'os';

const desktopEntry = `[Desktop Entry]
Encoding=UTF-8
Categories=Office
Exec=com-pake-${process.env.NAME}
Icon=com-pake-${process.env.NAME}
Name=com-pake-${process.env.NAME}
Name[zh_CN]=${process.env.NAME_ZH}
StartupNotify=true
Terminal=false
Type=Application
`;

const variables = {
  url: process.env.URL,
  name: process.env.NAME,
  title: process.env.TITLE,
  nameZh: process.env.NAME_ZH,
  shortName: process.env.SHORT_NAME || process.env.NAME_ZH,

  pakeConfigPath: 'src-tauri/pake.json',
  tauriConfigPath: 'src-tauri/tauri.conf.json',
  identifier: `com.pake.${process.env.NAME}`,

  linux: {
    configFilePath: 'src-tauri/tauri.linux.conf.json',
    iconPath: `src-tauri/png/${process.env.NAME}_512.png`,
    productName: `com-pake-${process.env.NAME}`,
    defaultIconPath: 'src-tauri/png/icon_512.png',
    icon: [`png/${process.env.NAME}_512.png`],
    desktopEntry,
    desktopEntryPath: `src-tauri/assets/com-pake-${process.env.NAME}.desktop`,
    desktopEntryConfig: {
      configKey: `/usr/share/applications/com-pake-${process.env.NAME}.desktop`,
      configValue: `assets/com-pake-${process.env.NAME}.desktop`,
    },
  },
  macos: {
    configFilePath: 'src-tauri/tauri.macos.conf.json',
    iconPath: `src-tauri/icons/${process.env.NAME}.icns`,
    defaultPath: 'src-tauri/icons/icon.icns',
    icon: [`icons/${process.env.NAME}.icns`],
  },
  windows: {
    configFilePath: 'src-tauri/tauri.windows.conf.json',
    iconPath: `src-tauri/png/${process.env.NAME}_32.ico`,
    defaultPath: 'src-tauri/png/icon_32.ico',
    hdIconPath: `src-tauri/png/${process.env.NAME}_256.ico`,
    hdDefaultPath: 'src-tauri/png/icon_256.ico',
    icon: [`png/${process.env.NAME}_256.ico`, `png/${process.env.NAME}_32.ico`],
    resources: [`png/${process.env.NAME}_32.ico`],
  },
};

validate();

updatePakeJson();

updateTauriJson();

function updateWindowsConfig() {
  if (windowsJson.bundle && windowsJson.bundle.windows) {
    console.log('Configuring Windows MSI package settings');
    
    if (!windowsJson.bundle.windows.wix) {
      windowsJson.bundle.windows.wix = {};
    }
    
    windowsJson.bundle.windows.wix.language = windowsJson.bundle.windows.wix.language || ["en-US"];
    
    console.log(`Windows MSI配置已更新，移除了无效属性`);
  }
  
  delete windowsJson.productName;
}

let platformVariables;
let platformConfig;

updateWindowsConfig();

switch (os.platform()) {
  case 'linux':
    platformVariables = variables.linux;
    platformConfig = linuxJson;
    updateDesktopEntry();
    break;
  case 'darwin':
    platformVariables = variables.macos;
    platformConfig = macosJson;
    break;
  case 'win32':
    platformVariables = variables.windows;
    platformConfig = windowsJson;
    updateResources();
    updateIconFile(platformVariables.hdIconPath, platformVariables.hdDefaultPath);
    break;
  default:
    console.warn(`Unsupported platform: ${os.platform()}`);
    // Default to macOS settings as fallback
    platformVariables = variables.macos;
    platformConfig = macosJson;
    break;
}

if (platformVariables && platformVariables.iconPath && platformVariables.defaultIconPath) {
  updateIconFile(platformVariables.iconPath, platformVariables.defaultIconPath);
} else {
  console.warn('Platform variables not properly defined, skipping icon update');
}

if (platformVariables && platformConfig) {
  updatePlatformConfig(platformConfig, platformVariables);
} else {
  console.warn('Platform variables or config not properly defined, skipping platform config update');
}

save();

function validate() {
  if (!('URL' in process.env)) {
    console.log('URL is not set');
    process.exit(1);
  }

  console.log(`URL: ${process.env.URL}`);

  if (!('NAME' in process.env)) {
    console.log('NAME is not set');
    process.exit(1);
  }

  console.log(`NAME: ${process.env.NAME}`);

  if (!('TITLE' in process.env)) {
    console.log('TITLE is not set');
    process.exit(1);
  }

  console.log(`TITLE: ${process.env.TITLE}`);

  if (!('NAME_ZH' in process.env)) {
    console.log('NAME_ZH is not set');
    process.exit(1);
  }

  console.log(`NAME_ZH: ${process.env.NAME_ZH}`);
  
  // SHORT_NAME是可选的，默认使用NAME_ZH
  if ('SHORT_NAME' in process.env) {
    console.log(`SHORT_NAME: ${process.env.SHORT_NAME}`);
  } else {
    console.log(`SHORT_NAME not set, will use NAME_ZH: ${process.env.NAME_ZH}`);
  }
}

function updatePakeJson() {
  pakeJson.windows[0].url = variables.url;
}

function updateTauriJson() {
  tauriJson.productName = variables.shortName;
  
  const jsonContent = JSON.stringify(tauriJson, null, 2);
  writeFileSync('src-tauri/tauri.conf.json', jsonContent);
  console.log(`Updated global product name to: ${tauriJson.productName}`);
}

function updateIconFile(iconPath, defaultIconPath) {
  if (!iconPath || !defaultIconPath) {
    console.warn(`Icon paths not properly defined. iconPath: ${iconPath}, defaultIconPath: ${defaultIconPath}`);
    return;
  }
  
  if (!existsSync(iconPath)) {
    console.warn(`Icon for ${process.env.NAME} not found, will use default icon`);
    copyFileSync(defaultIconPath, iconPath);
  }
}

function updatePlatformConfig(platformConfig, platformVariables) {
  if (!platformConfig.bundle.icon || (platformVariables && platformVariables.icon)) {
    platformConfig.bundle['icon'] = platformVariables.icon;
  }
  
  platformConfig.identifier = variables.identifier;
}

function save() {
  writeFileSync(variables.pakeConfigPath, JSON.stringify(pakeJson, null, 2));
  
  // 保存主配置文件
  writeFileSync(variables.tauriConfigPath, JSON.stringify(tauriJson, null, 2));
  console.log(`保存了主配置文件: ${variables.tauriConfigPath}`);

  // 确保Linux配置不包含无效属性
  if (variables.linux) {
    // 删除无效属性
    delete linuxJson.productName;
    delete linuxJson.tauri;
    
    writeFileSync(variables.linux.configFilePath, JSON.stringify(linuxJson, null, 2));
    console.log(`保存了Linux配置文件: ${variables.linux.configFilePath}`);
  }
  
  // 确保平台特定配置不包含无效属性
  if (platformVariables && platformVariables.configFilePath) {
    // 删除无效属性
    delete platformConfig.productName;
    delete platformConfig.tauri;
    
    writeFileSync(platformVariables.configFilePath, JSON.stringify(platformConfig, null, 2));
    console.log(`保存了平台特定配置文件: ${platformVariables.configFilePath}`);
  }

  // 确保macOS配置不包含无效属性
  if (variables.macos) {
    // 删除无效属性
    delete macosJson.productName;
    delete macosJson.tauri;
    
    writeFileSync(variables.macos.configFilePath, JSON.stringify(macosJson, null, 2));
    console.log(`保存了macOS配置文件: ${variables.macos.configFilePath}`);
  }

  // 确保Windows配置不包含无效属性
  if (variables.windows) {
    // 删除无效属性
    delete windowsJson.productName;
    delete windowsJson.tauri;
    
    writeFileSync(variables.windows.configFilePath, JSON.stringify(windowsJson, null, 2));
    console.log(`保存了Windows配置文件: ${variables.windows.configFilePath}`);
  }
}

function updateDesktopEntry() {
  linuxJson.bundle.linux.deb.files = {};
  linuxJson.bundle.linux.deb.files[variables.linux.desktopEntryConfig.configKey] = variables.linux.desktopEntryConfig.configValue;
  writeFileSync(variables.linux.desktopEntryPath, variables.linux.desktopEntry);
}

function updateResources() {
  windowsJson.bundle.resources = variables.windows.resources;
}
