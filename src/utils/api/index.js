let baseApiUrl = `${window.location.protocol}//${window.location.hostname}`


function getBaseApiUrl() {
    return localStorage.getItem("url") || baseApiUrl || "localhost";
}

export const getBaseUrl = () => {
    return getBaseApiUrl() + ":" + getPort()
}
export const getPort = () => {
    return localStorage.getItem("port") || window.location.port || "8080"
}

export const setBaseApiUrl = (baseUrl) => {
    if(baseUrl) {
            baseApiUrl = baseUrl;
            localStorage.setItem("url", baseUrl);
    }
}
export const setPort = (port) => {
    if(port) {
            localStorage.setItem("port", port);
    }
}
