# regular-redux-util
regularjs X redux

## 使用步骤

### 一、将store绑定到外层组件

#### 1、创建 store

```javascript
const ReduxUtil = require('regular-redux-util');

// 外层组件
let WrapperComponent = BaseComponent.extend({
  // ...
  config(data) {
    // 初始化&绑定 store
    data.store = ReduxUtil.createStore(
      reducer, // reducer
      initialState, // 可选。普通对象{}，为store设置一个初始值
      // 可选。中间件，默认值为： thunk 和 promise
      [ReduxUtil.middleware.thunk, ReduxUtil.middleware.promise],
      // 可选。其他可配置参数
      {
        isDev: window.DEBUG, // 可选。当前是否为开发环境
        disableImmutableJS: false // 可选。是否不支持immutable，默认为false，表示支持
      }
    );
  },
  //...
});

// 为外层组件添加 StoreProvider
WrapperComponent.use(ReduxUtil.StoreProvider);

```
##### 参数解释

1. reducer：符合redux定义的一个reducer函数 or 对象（使用多个reducer时）。注意：reducer 函数要由 ReduxUtil.createReducer 创建。对象可以由多个reducer函数拼装得到。
2. initialState：可选。普通对象{}，为store设置一个初始值。
   - 建议一定要写，开发时可以很方便的查看state的数据结构
3. middlewares：可选，中间件，默认会提供 thunk 和 promise 中间件。当有值的时候，默认会被覆盖。在开发环境还会提供logger中间件。
   - promise中间件api参考自：https://github.com/pburtchaell/redux-promise-middleware 5.x版
   - 开发环境的判断见下面的第4点
4. config：可选，一些配置参数。
   - isDev：可选。当前是否为开发环境。默认值由：window.DEBUG || /localhost|\d+\.\d+\.\d+\.\d+/.test(location.hostname) 来确定
   - disableImmutableJS：可选。是否不支持immutable，默认为false，表示支持

#### 2、外层组件的模板

```html
<!-- 外层包裹 StoreProvider，并绑定 store 字段 -->
<StoreProvider store={store}>
  
  <sub-component></sub-component>
  <sub-component2></sub-component2>
  ...
  
</StoreProvider>
```



### 二、action

#### 1、创建普通的action

```javascript
const ReduxUtil = require('regular-redux-util');

// 方式一
let actions;
const actionObj = {
  // 图片模块，切换主图
  changeImg(bigImg, selectIndex) {
    return {
      payload: {
        bigImg, selectIndex
      }
    };
  }
};
actions = ReduxUtil.createAction(actionObj);

// 方式二
actions.add('updateAddress', address => { payload: address });

```

#### 2、创建异步请求（有副作用）的action

```javascript
// 1、使用 promise 中间件( payload 的值为一个 promise )
// 获取地址
getAddress(query = {}) {
  return {
    payload: service.getAddress(query)
      .then((json = {}) => {
        return (json.retcode === 200) ?
          Promise.resolve(json.addressDto || C.DEF_ADDRESS) :
        Promise.resolve(C.DEF_ADDRESS);
      })
      .catch((err) => {
        return Promise.resolve(C.DEF_ADDRESS);
      })
  };
}

// 2、如果参数需要从 state 中获取，可以 thunk 和 promise 中间件结合使用
// 获取异步数据
initAsyncData(address) {
  // thunk action
  return (dispatch, getState) => {
    let state = getState();
    let query = Object.assign({}, address, {
      goodsId: state.get('goodsId'),
      categoryId: state.get('categoryId')
    });
    // promise action
    return dispatch(actions.initAsyncDataService(query));
  };
},
// 真正的promise类型的action
initAsyncDataService(query) {
  return {
    payload: service.getAsyncData({
      query
    })
    .then((json = {}) => {
      if (json.code === 200) {
        return Promise.resolve(json.data);
      }
      return Promise.reject(json || {});
    })
    .catch((err) => {
      return Promise.reject(err);
    })
  };
}
```

##### promise中间件

- api参考自：https://github.com/pburtchaell/redux-promise-middleware 5.x版
- dispatch该action之后，会立即触发所绑定的reducer中的pedding
- promise对象如果返回Promise.resolve，则触发所绑定的reducer中的fulfilled
- promise对象如果返回Promise.reject，则触发所绑定的reducer中的fulfilled
- 后面会介绍如何定义reducer，以及它的pedding、fulfilled、rejected


### 三、reducer

#### 1、创建reducer，绑定action

```javascript
const ReduxUtil = require('regular-redux-util');

// 之前创建的action
const {
	  changeImg, // 普通
    getAddress, // 异步
    initAsyncDataService // 异步
} = require('../action-factory');

// reduer 实例
let reducer = ReduxUtil.createReducer();

// 普通的action绑定的reducer
reducer.add(changeImg, (state, action) => {
  return state;
});

// 一个异步action绑定的3个reducer
reducer.add(getAddress.pending, (state, action) => {
  // ...
  return state;
});
reducer.add(getAddress.fulfilled, (state, action) => {
  // ...
  return state;
});
reducer.add(getAddress.rejected, (state, action) => {
  // ...
  return state;
});

// 另一种写法，集合在一起
reducer.add(getAddress, {
  pending(state, action) => state,
  fulfilled(state, action) => state,
  rejected(state, action) => state,
});

// 另另种，将错误的情况统一处理
reducer.add([
  getAddress.rejected,
  initAsyncData.rejected,
], state => {
  //...
  return state;
});
```

#### 2、在reducer中调用其他reducer

**reducer就是一个纯函数，为了更好的复用，可以在一个reducer中调用其他reducer**

```javascript
const ReduxUtil = require('regular-redux-util');

// 之前创建的action
const {
	  changeImg, // 普通
    getAddress, // 异步
    initAsyncDataService // 异步
} = require('../action-factory');

// ...

// 异步数据获取成功
reducer.add(initAsyncDataService.fulfilled, (state, action) => {
  // ... bigImg, selectIndex
  
  // 切换主图
  // 生成 changeImg 绑定的 reducer 的action对象
  const changeImgAction = changeImg(bigImg, selectIndex);
  // 调用 changeImg 绑定的 reducer
  //  - 注意：返回值要赋值给 state，否则无法修改state的结果
  state = reducer.exec(changeImg, state, changeImgAction);
  
  // ...
  return state;
});

// ...

```

### 四、container组件

container组件，就是绑定了redux的regular组件。

当redux的state发生变化时（dispatch了action，触发reducer之后，state就应当发生变化），会触发所有container组件的**更新**。

**更新**：拉取新的state上的数据，更新regular中的data变量，最后调用 `this.$update()`。

一个container组件的创建步骤如下：

#### 1、引入需要的action和reduxUtil

```javascript

const ReduxUtil = require('regular-redux-util');
const {
    initSyncData,
    getAddress,
    initAsyncData,
    triggerVidList,
    buyNow
} = require('../action-factory');

```

#### 2、创建regular组件

```Javascript

let Common = DetailComponent.extend({
    template,
	  data: {
  	  selVidList: [] // 已选择的sku
	  },
    config() {},
    init() {
      // dispatch一个action
      this.initSyncData(window.__syncData || {});
    },
    //...
});

```

#### 3、将regular组件绑定到redux

```javascript

module.exports = ReduxUtil.connect({
    mapState(state) {
        // 已选择的sku
        let selVidList = state.getIn(['skuProps', 'selVidList']);
        return {
            selVidList
        };
    },
    // state改变后是否触发组件的刷新
    listenStateChange: ['skuProps', 'async.goodsCouponList'],
    // 绑定到this上的action
    mapDispatch: [
        initSyncData,
        getAddress,
        initAsyncData,
        triggerVidList,
        buyNow
    ],
	  options: {
        // 自动emit事件：
        // this.$emit('rdx-connected')
        // this.$emit('rdx-afterchanged')
        // this.$emit('rdx-injected')
        emit: true
    }
})(Common);

```

###### 参数解释：

1. **mapState**：state改变后，将会执行所有组件的mapState函数。函数的参数是redux的state。函数的返回值`newMappedState`将会使用`newMappedState && Object.assign(this.data, newMappedState);`更新组件的data，并最终通过`this.$udpate()`更新组件的视图。注意，当使用不可变数据类型（disableImmutableJS: false）的时候，state是一个immutable对象。
2. **listenStateChange**：mapState的模式会引起性能问题。因为reducer触发了state更新之后，会触发所有container组件的mapState，这是不合理的。因此可以通过`listenStateChange`参数来做一次筛选，只有当`listenStateChange`中的数据发生变化时，才会执行`mapState`函数。比如在上面的例子里，只有当`state.skuProps`或`state.async.goodsCouponList`发生改变的时候，才会执行`mapState`函数。
3. **mapDispatch**：container组件的逻辑中，如果需要dispatch一个action，那么需要将这个action函数写到`mapDispatch`这个参数下面。比如`initSyncData`然后就可以通过`this.initSyncData(window.__syncData || {});`来dispatch这个action了。
4. **options:{emit: boolean}**：emit参数默认为false。当emit设置为true的时候，会在cotainer组件的生命周期中，自动emit三个事件。
   - **rdx-connected**：只触发一次，在首次`mapState`执行之后
   - **rdx-afterchanged**：每次执行`mapState`后都会触发
   - **rdx-injected**：只执行一次，当组件可以获取`this.$refs.xx`的之后触发。如果组件被实例化多次，也会被触发多次。

### 五、将container添加到外层组件

```javascript
const Common = require('./redux-base/container/common');

WrapperComponent.component('Common', Common);

```

```html
<StoreProvider store={store}>
  ...
    <Common
        on-loaded={this.loaded($event)}
        on-refreshTopBar={this.refreshTopBar($event)}
        ></Common>
  ...
</StoreProvider>
```

到这里，使用步骤就介绍完了



## 实践

### 一、关于使用不可变数据类型

### 二、使用initialState

### 三、action的粒度

### 四、使用listenStateChange可能遇到的问题















