# GPIX file to image converter
this can create PNG or SVG from a GPX file.  This is for GPX file from RELIVE.CC to create a 3D image of a bike ride.  This is a simple way to create a 2D image of a bike ride.  
If you use RELIVE, you can download GPX files from [https://www.relive.cc/settings/my-data](https://www.relive.cc/settings/my-data)

Have many files, [https://chromewebstore.google.com/detail/batch-link-downloader/aiahkbnnpafepcgnhhecilboebmmolnn](https://chromewebstore.google.com/detail/batch-link-downloader/aiahkbnnpafepcgnhhecilboebmmolnn) is a Chrome extension that can download all files from a page.  This is useful to download all files from a page.

It creates PNG or SVGs along with log.txt which contains image file name with Relive activity name.  This is useful to keep track of images.


clone this repo, then run:
```
npm install
mkdir ./gpx-files
mkdir ./output-images
```
this install libray and create input/output directories

to create PNGs 
```
node ./generatePngs.mjs
```

to create SVGs 
```
node ./generateSVGs.mjs
```