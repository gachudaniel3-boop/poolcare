module.exports = {
    content: [
        './poolcare_contractors_website.html',
        './assets/js/**/*.js'
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    navy: '#101422',
                    deep: '#101422',
                    card: '#272B3B',
                    cyan: '#A8DCE7',
                    teal: '#A8DCE7',
                    light: '#FFFFFF',
                    accent: '#A8DCE7'
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
            },
            spacing: {
                13: '3.25rem'
            }
        }
    },
    plugins: []
};
