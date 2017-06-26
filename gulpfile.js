var gulp = require('gulp');
var pandoc = require('gulp-pandoc');
var rimraf = require('rimraf');
var fs = require('fs');
var print = require('gulp-print');
var concat = require('gulp-concat');
var foreach = require('gulp-foreach');

var css = 'bower_components/github-markdown-css/github-markdown.css';

gulp.task('clean', function (cb) {
  rimraf('./dist', cb);
});

gulp.task('html', ['clean'], function() {

  gulp.src('src/index.md')
    .pipe(pandoc({
      from: 'markdown',
      to: 'html5',
      ext: '.html',
      args: ['--template=res/template-html.html']
    }))
    .pipe(gulp.dest('./dist'));

  gulp.src('src/chapter*.md')
    .pipe(foreach(function(stream, file){
      var name = /([^\\\/]*)$/.exec(file.path)[1];
      var number = parseInt(/^chapter([0-9]*?)\.md$/.exec(name)[1]) - 1;
      return stream.pipe(pandoc({
        from: 'markdown',
        to: 'html5',
        ext: '.html',
        args: ['--template=res/template-html.html', '--number-sections', '--number-offset', number]
      }))
      .pipe(gulp.dest('./dist'));
    }));

  gulp.src('src/chapter*.md')
    .pipe(concat('purescript-book-ja.html'))
    .pipe(pandoc({
        from: 'markdown',
        to: 'html5',
        ext: '.html',
        args: ['--template=res/template-html.html', '--number-sections']
     }))
    .pipe(gulp.dest('./dist'));

  gulp.src(['res/logo-shadow.png']).pipe(gulp.dest('./dist'));
  gulp.src(['res/favicon-96x96.png']).pipe(gulp.dest('./dist'));
  gulp.src([css]).pipe(gulp.dest('./dist'));
});

gulp.task('watch', function () {
    gulp.watch('src/*', ['html']);
});

gulp.task('epub', ['clean'], function() {
    gulp.src('*.md')
    .pipe(concat('all.md', {newLine: '\n'}))
    .pipe(gulp.dest('temp'));;


  return gulp.src('src/chapter*.md')
    .pipe(concat('all.md', {newLine: '\n'}))

    .pipe(pandoc({
      from: 'markdown',
      to: 'epub3',
      ext: '.epub',
      args: [
        '--output=dist/purescript-book-ja.epub', 
        '--epub-stylesheet', css, 
        '--template=res/template-epub.html', 
        '--epub-metadata=res/metadata.xml', 
        '--epub-cover-image=res/cover.png'
      ]
    }))
    .pipe(gulp.dest('temp'));;
});


gulp.task('md', ['clean'], function() {

  gulp.src('src/chapter*.md')
    .pipe(foreach(function(stream, file){
      var name = /([^\\\/]*)$/.exec(file.path)[1];
      var number = parseInt(/^chapter([0-9]*?)\.md$/.exec(name)[1]) - 1;
      return stream.pipe(pandoc({
        from: 'markdown',
        to: 'markdown_strict',
        ext: '.md',
        args: []
      }))
      .pipe(gulp.dest('dist/markdown'));
    }));

  return gulp.src([css])
    .pipe(gulp.dest('./dist/html'));
});


gulp.task('default', ['clean', 'html', 'epub']);