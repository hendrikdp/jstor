module.exports = {
    transform: {
        "^.+\\.[t|j]sx?$": "babel-jest"
    },
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**"
    ],
    transformIgnorePatterns: [
        "<rootDir>/node_modules/(?!lodash-es)"
    ]
};