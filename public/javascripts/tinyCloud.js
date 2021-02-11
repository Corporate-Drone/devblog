tinymce.init({
  // selector: '#mytextarea'
  selector: '.tinycloud',
  menubar: true,
  statusbar: false,
  branding: false,
  plugins: [
    "image",
    "link",
    "media"
  ],
  link_assume_external_targets: true

});