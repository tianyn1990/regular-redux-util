var Immutable = require('immutable');
var u = require('./tool/util');
var createStore = require('./tool/create-store');
var createReducer = require('./tool/create-reducer');
var createAction = require('./tool/create-action');
var connect = require('./connector/connect');
var StoreProvider = require('./connector/store-provider');
var thunkMiddleware = require('./middlewares/thunk');
var promiseMiddleware = require('./middlewares/promise');
module.exports = {
    Immutable: Immutable,
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