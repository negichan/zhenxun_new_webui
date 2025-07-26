let baseApiUrl = `${window.location.protocol}//${window.location.hostname}`
let baseHost = `${window.location.hostname}:${window.location.port}`


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

export const getHost = () => {
    return getBaseUrl().replace(/^https?:\/\//, "");
}