module.exports = function withFirebaseModularHeaders(config) {
    return {
        ...config,
        ios: {
            ...config.ios,
            buildProperties: {
                ...config.ios?.buildProperties,
                useFrameworks: "static",
            },
        },
    };
};
