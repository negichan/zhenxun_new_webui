export const auth ={
    setAuthState(state:boolean){
            sessionStorage.setItem('isAuthenticated', String(state));
    },
    getAuthState() {
        return sessionStorage.getItem('isAuthenticated') === 'true';
    },
    setAuthToken(type:string,token:string){
        let access_token = `${type.charAt(0).toUpperCase() + type.slice(1)} ${token}`
        sessionStorage.setItem('token', access_token);
    },
    getAuthToken(){
        return sessionStorage.getItem('token');
    },
    deleteAuthToken(){
        sessionStorage.removeItem('token');
    },
    logout(){
        this.deleteAuthToken()
        this.setAuthState(false)
    }

}