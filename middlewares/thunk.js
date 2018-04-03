function thunkMiddleware(extra) {
    return function(liteStore) {
        var dispatch = liteStore.dispatch,
            getState = liteStore.getState;
        return function(next) {
            return function(action) {
                return handleAction(action, next, dispatch, getState, extra);
            };
        };
    };
}

function handleAction(action, next, dispatch, getState, extra) {
    if (typeof action === 'function') {
        return action(dispatch, getState, extra);
    }
    return next(action);
}

var thunk = thunkMiddleware();
thunk.withExtra = thunkMiddleware;

module.exports = thunk;