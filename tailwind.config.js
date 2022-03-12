module.exports = {
	content: [
		'./*.hbs',
		'./**/*.hbs',
		'./assets/css/*.css',
		'./assets/css/**/*.css',
		'./node_modules/flowbite/**/*.js',
	],
	theme: {
		extend: {
			fontFamily: {
				'work-sans': ['"Work Sans"'],
				merriweather: ['"Merriweather"'],
			},
			colors: {
				brand: {
					50: '#e2eeff',
					100: '#b3ccff',
					200: '#83aafd',
					300: '#5288f9',
					400: '#2366f6',
					500: '#094cdc',
					600: '#023bac',
					700: '#002a7c',
					800: '#00194d',
					900: '#00081f',
				},
			},
		},
	},
	plugins: [require('flowbite/plugin')],
};
