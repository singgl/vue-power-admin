# vue-power-admin
基础权限控制

### 基于vuex, vue-router,vuex的权限控制
```javascript
/* 初始路由 */
export default new Router({
    routes: [
        {
            path: '/login',
            component: Login
        }
    ]
})

/* 准备动态添加的路由 */
export const DynamicRoutes = [
    {
        path: '',
        component: Layout,
        name: 'container',
        redirect: 'home',
        meta: {
            requiresAuth: true,
            name: '首页'
        },
        children: [
            {
                path: 'home',
                component: Home,
                name: 'home',
                meta: {
                    name: '首页',
                    icon: 'icon-home'
                }
            }
        ]
    },
    {
        path: '/403',
        component: Forbidden
    },
    {
        path: '*',
        component: NotFound
    }
]
```
### 我们要根据当前用户的token去后台获取权限。
> 由于权限这块逻辑还挺多，所以在vuex添加了一个permission模块来处理权限。
  为了判断是已有路由列表，需要在vuex的permission模块存一个state状态permissionList用来判断,假如permissionList不为null，即已经有路由，如果不存在，就需要我们干活了。
```javascript
router.beforeEach((to, from, next) => {
    if (!store.state.UserToken) {
        ...
    } else {
        /* 现在有token了 */
        if (!store.state.permission.permissionList) {
            /* 如果没有permissionList，真正的工作开始了 */
            store.dispatch('permission/FETCH_PERMISSION').then(() => {
                next({ path: to.path })
            })
        } else {
            if (to.path !== '/login') {
                next()
            } else {
                next(from.fullPath)
            }
        }
    }
})
```
> 来看一下 store.dispatch('permission/FETCH_PERMISSION') 都干了什么
```javascript
actions: {
    async FETCH_PERMISSION({ commit, state }) {
       /*  获取后台给的权限数组 */
        let permissionList = await fetchPermission()

        /*  根据后台权限跟我们定义好的权限对比，筛选出对应的路由并加入到path=''的children */
        let routes = recursionRouter(permissionList, dynamicRouter)
        let MainContainer = DynamicRoutes.find(v => v.path === '')
        let children = MainContainer.children
        children.push(...routes)

        /* 生成左侧导航菜单 */
        commit('SET_MENU', children)

        setDefaultRoute([MainContainer])

        /*  初始路由 */
        let initialRoutes = router.options.routes

        /*  动态添加路由 */
        router.addRoutes(DynamicRoutes)

        /* 完整的路由表 */
        commit('SET_PERMISSION', [...initialRoutes, ...DynamicRoutes])
    }
}
```
> 首先,await fetchPermission()获取后台给的权限数组，格式大概如下

```javascript
{
    "code": 0,
    "message": "获取权限成功",
    "data": [
        {
            "name": "订单管理",
            "children": [
                {
                    "name": "订单列表"
                },
                {
                    "name": "生产管理",
                    "children": [
                        {
                            "name": "生产列表"
                        }                     
                    ]
                },
                {
                    "name": "退货管理"
                }
            ]
        }
    ]
}

```
> 其次根据我们写好的路由数组，进行对比，过滤得到我们要的路由

```javascript
/* 这里是我们写好的需要权限判断的路由 */
const dynamicRoutes = [
    {
        path: '/order',
        component: Order,
        name: 'order-manage',
        meta: {
            name: '订单管理'
        },
        children: [
            {
                path: 'list',
                name: 'order-list',
                component: OrderList,
                meta: {
                    name: '订单列表'
                }
            },
            {
                path: 'product',
                name: 'product-manage',
                component: ProductManage,
                meta: {
                    name: '生产管理'
                },
                children: [
                    {
                        path: 'list',
                        name: 'product-list',
                        component: ProductionList,
                        meta: {
                            name: '生产列表'
                        }
                    },
                    {
                        path: 'review',
                        name: 'review-manage',
                        component: ReviewManage,
                        meta: {
                            name: '审核管理'
                        }
                    }
                ]
            },
            {
                path: 'returnGoods',
                name: 'return-goods',
                component: ReturnGoods,
                meta: {
                    name: '退货管理'
                }
            }
        ]
    }
]

export default dynamicRoutes
```
> 为了对比，我写好了一个递归函数，用name和meta.name进行对比 ，根据这个函数就可以得到我们想要的结果

```javascript
/**
 *
 * @param  {Array} userRouter 后台返回的用户权限json
 * @param  {Array} allRouter  前端配置好的所有动态路由的集合
 * @return {Array} realRoutes 过滤后的路由
 */

export function recursionRouter(userRouter = [], allRouter = []) {
    var realRoutes = []
    allRouter.forEach((v, i) => {
        userRouter.forEach((item, index) => {
            if (item.name === v.meta.name) {
                if (item.children && item.children.length > 0) {
                    v.children = recursionRouter(item.children, v.children)
                }
                realRoutes.push(v)
            }
        })
    })
    return realRoutes
}
```
> 得到过滤后的数组后，加入到path为''的children下面

```javascript
{
        path: '',
        component: Layout,
        name: 'container',
        redirect: 'home',
        meta: {
            requiresAuth: true,
            name: '首页'
        },
        children: [
            {
                path: 'home',
                component: Home,
                name: 'home',
                meta: {
                    name: '首页'
                }
            },
            <!-- 将上面得到的东西加入到这里 -->
            ...
        ]
    }
}
```
> 这个时候,path为''的children就是我们左侧的导航菜单了，存到state的sidebarMenu待用。加入到children后，这时DynamicRoutes就可以加入到路由了。

```javascript
/*  动态添加路由 */
router.addRoutes(DynamicRoutes)


 /*  初始路由 */
let initialRoutes = router.options.routes
/* 合并起来，就是完整的路由了 */
commit('SET_PERMISSION', [...initialRoutes, ...DynamicRoutes])
```
> 路由添加完了，也就是action操作完毕了，即可在action.then里面调用 next({ path: to.path })进去路由，这里要注意, next里面要传参数即要进入的页面的路由信息，因为next传参数后，当前要进入的路由会被废止，转而进入参数对应的路由，虽然是同一个路由，这么做主要是为了确保addRoutes生效了

----

> 进入路由后，要开始生成左侧菜单，之前我们已经存到sidebarMenu了，现在需要做的只是递归生成菜单而已，虽然用了element的导航菜单，但是为了递归路由，还需要自己封装一下。这里核心的地方是组件的name，在组件里面有children的地方，又再次使用自己，从而遍历整个tree结构的路由。

```javascript
<template>
    <div class="menu-container">
        <template v-for="v in menuList">
            <el-submenu :index="v.name" v-if="v.children&&v.children.length>0" :key="v.name">
                <template slot="title">
                    <i class="iconfont icon-home"></i>
                    <span>{{v.meta.name}}</span>
                </template>
                <el-menu-item-group>
                    <my-nav :menuList="v.children"></my-nav>
                </el-menu-item-group>
            </el-submenu>
            <el-menu-item :key="v.name" :index="v.name" @click="gotoRoute(v.name)" v-else>
                <i class="iconfont icon-home"></i>
                <span slot="title">{{v.meta.name}}</span>
            </el-menu-item>
        </template>
    </div>
</template>

<script>
export default {
    name: 'my-nav',
    props: {
        menuList: {
            type: Array,
            default: function() {
                return []
            }
        }
    },
    methods: {
        gotoRoute(name) {
            this.$router.push({ name })
        }
    }
}
</script>
```

----

> 刷新页面后，根据我们router.beforeEach的判断，有token但是没permissionList，我们是会重新触发action去获取路由的，所以无需担心。但是导航菜单active效果会不见。不过我们已经把el-menu-item的key设置为路由的name，那么我们只要在刷新后，在afterEach把当前路由的name赋值给el-menu default-active即可。同理，在afterEach阶段获取所有matched的路由，即可实现面包屑导航。

```javaseript
if (!store.state.permission.permissionList) {
    store.dispatch('permission/FETCH_PERMISSION').then(() => {
        next({ path: to.path })
    })
} 



...
router.afterEach((to, from, next) => {
    var routerList = to.matched
    store.commit('setCrumbList', routerList)
    store.commit('permission/SET_CURRENT_MENU', to.name)
})

```

> 退出登陆后，需要刷新页面，因为我们是通过addRoutes添加的，router没有deleteRoutes这个api，所以清除token,清除permissionList等信息，刷新页面是最保险的。

```javascript
var instance = axios.create({
    timeout: 30000,
    baseURL
})

// 添加请求拦截器
instance.interceptors.request.use(
    function(config) {
        // 请求头添加token
        if (store.state.UserToken) {
            config.headers.Authorization = store.state.UserToken
        }
        return config
    },
    function(error) {
        return Promise.reject(error)
    }
)

/* axios请求二次封装 */
instance.get = function(url, data, options) {
    return new Promise((resolve, reject) => {
        axios
            .get(url, data, options)
            .then(
                res => {
                    var response = res.data
                    if (response.code === 0) {
                        resolve(response.data)
                    } else {
                        Message.warning(response.message)
                        /* reject(response.message) */
                    }
                },
                error => {
                    if (error.response.status === 401) {
                        Message.warning({
                            message: '登陆超时,请重新登录'
                        })
                        store.commit('LOGIN_OUT')
                        window.location.reload()
                    } else {
                        Message.error({
                            message: '系统异常'
                        })
                    }
                    reject(error)
                }
            )
            .catch(e => {
                console.log(e)
            })
    })
}

export default instance
```
