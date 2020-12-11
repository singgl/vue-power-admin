import axios from '@/config/httpConfig'

console.log(axios, '----')
export function fetchPermission() {
    return axios.get('/static/permission.json')
}

export function login() {
    return axios.get('@/static/login.json')
}
