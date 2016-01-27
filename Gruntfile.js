module.exports = function(grunt)
{

    grunt.initConfig({
        project: {
            components: 'components/**/*.vue',
            services: 'services/**/*.js',
            dist: 'dist/',
        },
        clean: ["<%= project.dist %>"],
        copy: {
            index: {
                src: 'index.html',
                dest: '<%= project.dist %>index.html',
            },
        },
        babel: {
            options: {
                sourceMap: true,
            },
            services: {
                files: [
                    {
                        expand: true,
                        src: '<%= project.services %>',
                        dest: '<%= project.dist %>',
                    },
                ],
            },
        },
        vueify: {
            components: {
                files: [
                    {
                        expand: true,
                        src: '<%= project.components %>',
                        dest: '<%= project.dist %>',
                        ext: '.vue.js',
                    },
                ],
            },
        },
    });

    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-vueify');

    grunt.registerTask('build', ['clean', 'copy', 'babel', 'vueify']);
    grunt.registerTask('default', ['build']);
};
