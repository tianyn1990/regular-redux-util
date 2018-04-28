let Immutable = require('immutable');
let u = require('./tool/util');
let createStore = require('./tool/create-store');
let createReducer = require('./tool/create-reducer');
let createAction = require('./tool/create-action');
let connect = require('./connector/connect');
let StoreProvider = require('./connector/store-provider');
let thunkMiddleware = require('./middlewares/thunk');
let promiseMiddleware = require('./middlewares/promise');

if(!u) return;

var a;

module.exports = {
    Immutable,
    fromJS: Immutable.fromJS,
    toJS: u.toJS,

    // 工具
    createStore: createStore,
    createReducer: createReducer,
    createAction: createAction,

    // 容器组件的连接器
    connect: connect,

    // 添加 <StoreProvider> 容器组件，通过 SomeComponent.use 来使用
    StoreProvider: StoreProvider,

    // 中间件
    middleware: {
        thunk: thunkMiddleware,
        promise: promiseMiddleware
    }
};