import Vue from 'vue'
import App from '@/App'
import store from '@/store/index'
import router from '@/router/index'

import ElementUI from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './styles/index.scss'

import axios from './config/httpConfig'
import * as globalFilter from './filters/filters'

Vue.prototype.$http = axios

Object.keys(globalFilter).forEach(key => {
    Vue.filter(key, globalFilter[key])
})

Vue.use(ElementUI)

Vue.config.productionTip = false
console.log(router)
// debugger

router.beforeEach((to, from, next) => {
    console.log(to,from, !store.state.UserToken)
    if (!store.state.UserToken) {
        if ( to.matched.length > 0 && !to.matched.some(record => record.meta.requiresAuth) ) {
            console.log('2')
            next()
        } else {
            next({ path: '/login' })
        }
    } else {
        if (!store.state.permission.permissionList) {
            console.log('hahaha')
            store.dispatch('permission/FETCH_PERMISSION').then(() => {
                next({ path: to.path })
            })
        } else {
            if (to.path !== '/login') {
                console.log('3')
                next()
            } else {
                console.log('1')
                next(from.fullPath)
            }
        }
    }
})

router.afterEach((to, from, next) => {
    var routerList = to.matched
    store.commit('setCrumbList', routerList)
    store.commit('permission/SET_CURRENT_MENU', to.name)
})

/* eslint-disable no-new */
new Vue({
    el: '#app',
    router,
    store,
    components: { App },
    template: '<App/>'
})
