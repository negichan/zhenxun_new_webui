export const auth ={
    setAuthState(state){
        if (typeof state == 'boolean') {
            sessionStorage.setItem('isAuthenticated', state);
        }
    },
    getAuthState() {
        return sessionStorage.getItem('isAuthenticated') === 'true';
    },
    setAuthToken(type,token){
        console.log(typeof token)
        console.log(typeof type)
        if (typeof token == 'string' && typeof type === 'string' ) {
            let access_token = `${type.charAt(0).toUpperCase() + type.slice(1)} ${token}`
            sessionStorage.setItem('token', access_token);
        }
    },
    getAuthToken(){
        return sessionStorage.getItem('token');
    },
    deleteAuthToken(){
        sessionStorage.removeItem('token');
    }

}