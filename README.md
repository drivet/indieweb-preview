# indieweb-preview

An [IndieWeb friendly](https://indieweb.org/) link unfurling library.

There are several unfurling libraries available on NPM, but this one makes use of the 
[mf2utilsjs](https://github.com/drivet/mf2utiljs) library to at least attempt to provide
IndieWeb flavoured like author (via the [authorship algorithm](https://indieweb.org/authorship-spec))
and [featured image](https://indieweb.org/featured).

Falls back to using the [unfurljs](https://github.com/jacktuck/unfurl/) library if no
IndieWeb/MF2 information can be found.


