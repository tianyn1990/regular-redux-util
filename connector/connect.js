var u = require('../tool/util');
var getStore = require('./get-store');

/**
 * @param _ref
 * @param {Function|Object} _ref.mapState
 * @param {Function|Object} _ref.stateChanged state改变后是否触发组件的刷新
 * @param {Array} _ref.listenStateChange state改变后是否触发组件的刷新
 * @param {Array} _ref.mapDispatch 绑定到this上的action，用 this.someActionFn(xx) 替代 this.$dispatch(someActionFn(xx))
 * @param {Array} _ref.options 配置
 *   - @param {Boolean|String} _ref.options.emit 是否抛出事件（默认false） 'rdx-connected' 'rdx-afterchanged' 'rdx-injected'
 *   - @param {Boolean} _ref.options.dispatch 是否在组件this绑定$dispatch函数（默认true），也可以是字符串，指定绑定的字段名
 * @return {Function}
 *
 * example:
   ```
   connect({
       // state改变后是否触发组件的刷新
       mapState: function(state) {
           // state 为Immutable类型
           return {
               // 重要！：可以直接返回Immutable，这样方便框架自动做diff操作，尤其是对不经常变更的数据！！
               title: state.get('title'),
               // 也可以返回对象
               list: ReduxUtil.toJS(state.get('list')) || []
           };
       },
       
       // state改变后是否触发组件的刷新
       listenStateChange: ['skuProps'],

       // 绑定到this上的action，用 this.someActionFn(xx) 替代 this.$dispatch(someActionFn(xx))
       mapDispatch: [
           getUser
       ]

       // 默认true：可以通过 this.$dispatch 调用 store.dispatch
       // 为false：this.$dispatch 上不绑定 store.dispatch
       // 如果值为String，比如dispatch: '$dispatchAction'，则要通过 this.$dispatchAction 来调用 store.dispatch
       dispatch: false
 
   })(SomeComponent);
   ```
 */
function connect(_ref) {
    var connector = createConnector(_ref);
    return function(Component) {
        return connector(Component);
    };
}

function getMappedState(self, state, mapState, prevState) {
    if (u.isFunction(mapState)) {
        // state 可以是immutable对象，也可以是普通对象。由 createStore 中的 config 参数决定
        return mapState.call(self, state, prevState);
    }
    if (u.isImmutable(mapState)) {
        return mapState.toJS();
    }
    console.error('Expected mapState is an Immutable Object or function');
    return mapState || {};
}

function compareMappedState(prevMappedState, mappedState) {
    var keys = Object.keys(mappedState);
    var prevValue, value, valueIsImmutable;
    var newMappedState = {};
    keys.forEach(function(key) {
        value = mappedState[key];
        prevValue = prevMappedState[key];
        valueIsImmutable = u.isImmutable(value);
        // 如果是不可变数据类型，且相等，说明数据无变化，因此不需要更新
        if (valueIsImmutable && value === prevValue) {
            return;
        }
        newMappedState[key] = valueIsImmutable ? value.toJS() : value;
    });
    return newMappedState;
}

function createCustomEvent(self) {
    // emit 'rdx-connected'
    // 只触发一次，在 mapState 执行之后
    // 注意：如果被 stateChanged/listenStateChange 拦截，那么事件将不会触发
    var reduxConnected = (function() {
        var first = true; // 只执行一次
        return function() {
            if (!first) {
                return;
            }
            first = false;
            setTimeout(function() {
                self.$emit('rdx-connected');
            });
        };
    })();
    // emit 'rdx-afterchanged'
    // 每次 执行mapState 后都会触发
    // 注意：如果被 stateChanged/listenStateChange 拦截，那么事件将不会触发
    var reduxAfterChanged = function() {
        self.$emit('rdx-afterchanged');
    };
    // emit 'rdx-injected'
    // 只执行一次，可以获取 this.$refs.xx（如果组件被实例化多次，会多次触发）
    var reduxInjected = (function() {
        var first = true; // 只执行一次
        return function() {
            if (!first) {
                return;
            }
            first = false;
            var emit = function() {
                self.$emit('rdx-injected');
            };
            var clear = setTimeout(function() {
                emit();
            }, 100);
            setTimeout(function() {
                if (self.$refs && Object.keys(self.$refs).length) {
                    clearTimeout(clear);
                    emit();
                }
            });
        };
    })();
    return {
        reduxConnected: reduxConnected,
        reduxAfterChanged: reduxAfterChanged,
        reduxInjected: reduxInjected
    };
}

function hasListenStateChange(listenStateChange, curState, nextState) {
    var isImmutable = u.isImmutable(nextState);
    return listenStateChange.length &&
        listenStateChange.every(o => {
            var isAry = u.isArray(o);
            var isStr = u.isString(o);
            if(isStr && ~o.indexOf('.')) {
                o = o.split('.');
                isStr = false;
                isAry = true;
            }
            if(!isAry && !isStr) {
                throw new Error('Expected listenStateChange contains Array or String');
            }
            // 处理不可变类型
            if(isImmutable) {
                return isAry ? curState.getIn(o) === nextState.getIn(o)
                    : curState.get(o) === nextState.get(o);
            }
            // 处理可变类型array
            if(isAry) {
                var equal = true;
                var cur = curState;
                var next = nextState;
                o.forEach(s => {
                    if(!u.isString(s)) {
                        throw new Error('Expected listenStateChange contains Array or String');
                    }
                    if(!cur || !next) {
                        return;
                    }
                    cur = cur[s];
                    next = next[s];
                    if(cur !== next) {
                        equal = false;
                    }
                });
                return equal;
            }
            // 处理可变类型string
            return curState[o] === nextState[o];
        });
}

function createConnector(_ref) {
    _ref = _ref || {};
    var mapState = _ref.mapState || function() {
            return {};
        },
        stateChanged = _ref.stateChanged || function() {
            return true;
        },
        listenStateChange = _ref.listenStateChange || [],
        mapDispatch = _ref.mapDispatch || null,
        dispatchKey = '$dispatch',
        options = _ref.options || {dispatch: true, emit: false},
        dispatch = u.isNull(options.dispatch) ? true : options.dispatch,
        enableEmit = options.emit || false,
        enableDispatch = dispatch !== false;

    if (u.isString(dispatch)) {
        dispatchKey = dispatch;
    }

    function connector(Component) {
        return Component.implement({
            events: {
                $config: function() {
                    var self = this,
                        store = getStore(this),
                        data = this.data;

                    var curState = store.getState();

                    var emit = createCustomEvent(self);

                    var prevMappedState = {};

                    function mapStateFn(first) {
                        var nextState = store.getState();

                        // 可以由stateChanged自定义数据和视图的更新时机，减少$update次数
                        if (!stateChanged(curState, nextState) && !first) {
                            return;
                        }
                        // listenStateChange 中包含的对象发生变化时，才更新state
                        //  - 作用于 stateChanged 类似，用起来更简洁，适合简单的判断
                        if(hasListenStateChange(listenStateChange, curState, nextState) && !first) {
                            return;
                        }
                        // 更新数据和视图
                        var mappedState = getMappedState(self, nextState, mapState, curState);

                        // 通过对比两次的mappedState值，减少不必要的更新，主要是针对 Immutable 的优化
                        //  - 使用Immutable时，mapState可以直接返回Immutable组成的对象 { immutableObj1, immutableObj2, ...}
                        var newMappedState = compareMappedState(prevMappedState, mappedState);

                        newMappedState && Object.assign(data, newMappedState);

                        // 保存本次的 mappedState，用于下次的对比
                        prevMappedState = mappedState;
                        curState = nextState;

                        enableEmit && emit.reduxAfterChanged();
                        enableEmit && emit.reduxConnected();
                    }

                    // 加载完成后，调用一次，此时不校验 stateChanged/hasListenStateChange，确保组件至少执行一次 mapState
                    mapStateFn(true);

                    enableEmit && emit.reduxInjected();

                    if (enableDispatch) {
                        self[dispatchKey] = store.dispatch;
                    }

                    if(mapDispatch) {
                        if(u.isArray(mapDispatch)) {
                            mapDispatch.forEach(function(action) {
                                var actionString = u.action2String(action);
                                self[actionString] = function() {
                                    var args = u.like2Array(arguments);
                                    return store.dispatch(action.apply(null, args));
                                };
                            });
                        } else if(u.isFunction(mapDispatch)) {
                            self = Object.assign(self, mapDispatch(store.dispatch));
                        }
                    }

                    var unSubscribe = store.subscribe(() => {
                        var nextState = store.getState();
                        // state没变化，不处理
                        //  - 不能放到 mapStateFn 中，会影响第一次执行 `mapStateFn();`
                        if (
                            u.isImmutable(curState) &&
                            curState === nextState
                        ) {
                            return;
                        }
                        mapStateFn();
                    });
                    this.$on('destroy', unSubscribe);
                }
            }
        });
    }

    return connector;
}

connect.createConnector = createConnector;

module.exports = connect;