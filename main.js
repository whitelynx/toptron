import app from 'app';  // Module to control application life.
import BrowserWindow from 'browser-window';  // Module to create native browser window.

import ProcReader from './services/readProc';


// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
var mainWindow = null;

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd+Q.
    if(process.platform != 'darwin')
    {
        app.quit();
    } // end if
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/dist/index.html');

    // Open the DevTools.
    mainWindow.openDevTools();

    console.log("mainWindow.id: %j", mainWindow.id);

    mainWindow.webContents.on('did-finish-load', () => {
        var reader = new ProcReader();

        reader.on('update', () => {
            if(mainWindow)
            {
                mainWindow.webContents.send('update', reader.stats, reader.processes);
            } // end if
        });
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', () =>{
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        mainWindow = null;
    });
});
