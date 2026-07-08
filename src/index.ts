import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

import {
  addCategory,
  addExpense,
  deleteExpense,
  exportExpensesCsv,
  getDashboardData,
  renameCategory,
  setCategoryActive,
  setMonthlyBudget,
  updateExpense,
} from './database';
import type {
  AddCategoryInput,
  AddExpenseInput,
  RenameCategoryInput,
  SetCategoryActiveInput,
  SetMonthlyBudgetInput,
  UpdateExpenseInput,
} from './types';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = (): void => {
  const isQaCapture = Boolean(process.env.ACCOUNTING_QA_SCREENSHOT);
  const mainWindow = new BrowserWindow({
    width: 1487,
    height: 1058,
    useContentSize: true,
    minWidth: 1180,
    minHeight: 820,
    title: '桌面记帐',
    backgroundColor: '#f8faf9',
    show: false,
    paintWhenInitiallyHidden: true,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      offscreen: isQaCapture,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!isQaCapture) {
      mainWindow.show();
    }
  });

  if (process.env.ACCOUNTING_QA_SCREENSHOT) {
    mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    });
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error(`Renderer failed to load: ${errorCode} ${errorDescription}`);
    });
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      console.error(`Renderer process gone: ${details.reason}`);
    });
    mainWindow.webContents.once('did-finish-load', () => {
      console.log('Renderer finished loading');
      captureQaScreenshot(mainWindow);
    });
  }

  const initialUrl = new URL(MAIN_WINDOW_WEBPACK_ENTRY);
  if (process.env.ACCOUNTING_QA_PAGE) {
    initialUrl.searchParams.set('page', process.env.ACCOUNTING_QA_PAGE);
  }

  mainWindow.loadURL(initialUrl.toString());
};

const captureQaScreenshot = (mainWindow: BrowserWindow): void => {
  const screenshotPath = process.env.ACCOUNTING_QA_SCREENSHOT;
  if (!screenshotPath) {
    return;
  }

  const delayMs = Number(process.env.ACCOUNTING_QA_SCREENSHOT_DELAY_MS ?? 2500);
  setTimeout(async () => {
    try {
      const image = await mainWindow.webContents.capturePage();
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      fs.writeFileSync(screenshotPath, image.toPNG());
      console.log(`QA screenshot saved: ${screenshotPath}`);
    } catch (error) {
      console.error('QA screenshot failed:', error);
    } finally {
      app.quit();
    }
  }, Number.isFinite(delayMs) ? delayMs : 2500);
};

app.setName('桌面记帐');
app.setPath('userData', path.join(app.getPath('appData'), '桌面记帐'));

ipcMain.handle('dashboard:get', () => getDashboardData());
ipcMain.handle('expenses:add', (_event, input: AddExpenseInput) => addExpense(input));
ipcMain.handle('expenses:update', (_event, input: UpdateExpenseInput) => updateExpense(input));
ipcMain.handle('expenses:delete', (_event, id: number) => deleteExpense(id));
ipcMain.handle('categories:add', (_event, input: AddCategoryInput) => addCategory(input));
ipcMain.handle('categories:rename', (_event, input: RenameCategoryInput) => renameCategory(input));
ipcMain.handle('categories:setActive', (_event, input: SetCategoryActiveInput) => setCategoryActive(input));
ipcMain.handle('settings:setMonthlyBudget', (_event, input: SetMonthlyBudgetInput) => setMonthlyBudget(input));
ipcMain.handle('expenses:exportCsv', () => exportExpensesCsv());

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
