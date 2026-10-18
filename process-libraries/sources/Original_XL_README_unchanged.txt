freieFarbe HLC Colour Atlas XL Software Package
Version 1.1
================================================

This folder contains the data of the freieFarbe HLC Colour Atlas XL version:


- HLC-Colour-Atlas-XL_Layers_DE_v1.pdf: PDF version with layers for different output gamuts and RGB/CMYK colour values
- HLC-Colour-Atlas-XL_ColourValues_v1.pdf: list with sRGB/Hex and CMYK values for all colours
- HLC-Colour-Atlas-XL_ColourValues_v1.xls: colour value list as Excel file
- HLC-Colour-Atlas-XL_SpectralData_v1-1.cxf: spectral data (e.g. for formulation software)
- HLC-Colour-Atlas-XL_SpectralData_v1-1.xls: spectral data as Excel file
- HLC-Colour-Atlas-XL_SpectralData_CGATS_v1-1.txt: spectral data as CGATS text file
- liesmich_v1-1.txt: notes about the files

The values and calculations apply to illuminant D50 and 2° observer angle (standard in the printing industry).


PDF version (layers)
====================

Please open them in a current version of Adobe Acrobat Professional or Adobe Acrobat Reader. Other PDF viewers or browsers/plug-ins are often unable to display Lab colours and complex elements correctly.

The PDF version corresponds to the printed version. Here, individual gamut layers can be switched on and off, in which only the respective gamut will be displayed. So you can see at a glance in which output variants any HLC colour tone can be realized, and, if this is not the case, how it would be converted: as border colour of the respective gamut.

- CIELAB coordinate space: On this layer, all possible CIELAB coordinates are displayed.
- sRGB: Standard RGB for Office and Internet applications according to IEC 61699 and W3C specification
- PSO Uncoated V3 (FOGRA 52): current offset printing standard from FOGRA
- PSO Coated V3 (FOGRA 51): current offset printing standard of FOGRA
- ISO Coated V2 300 (ECI): current offset printing standard of the ECI
- Coated FOGRA 39: still the common offset printing standard of FOGRA
- HLC Colour Atlas XL (Epson SC-Px000V, semimatte, non-OBA): The colour fields shown here correspond to those in the printed copy.

In addition, the labels ("Text" layer) and field boundaries ("White Grid" layer) can be switched on and off.

Most gamuts were determined in Adobe Photoshop, while colourLogic ZePrA was used for the Epson version.

It should be noted that only the label layer has a transparent background; for the colour fields, only the topmost visible layer is displayed.


Colour Values
=============

The Excel spreadsheet contains the RGB/Hex/CMYK colour values of all 13283 HLC colour tones in several variants.

- RGB: sRGB according to IEC 61699 (standard monitor and printer output)
- HEX: sRGB in hexadecimal notation (e.g. for web design)
- ISO Coated V2: CMYK after conversion using ICC_Profile "ISO Coated V2 300% (ECI)" (Standard sheet offset printing on coated papers according to PSO v2 or ISO 12647-2:2009)
- PSO Coated V3: CMYK after conversion with ICC_Profile "PSOcoated_v3_FOGRA51" (Standard sheet offset printing on coated papers according to PSO V3)
- PSO Uncoated V3: CMYK after conversion using ICC_Profile "PSOuncoated_v3_FOGRA52" (Standard sheet offset printing on uncoated papers according to PSO v3)

If the used software allows an input of the Lab colour values, you should use these. The Lab colour values are on the individual atlas pages. Otherwise, use the CMYK colour values in prepress and the RGB values in all types of software.

If no RGB and/or CMYK colour values are specified, this colour is contained in the printed HLC Colour Atlas XL, but cannot be reproduced in the relevant output variant (out of gamut). In these cases, use a neighbouring colour that is contained in the gamut.


Spectral data
=============

The Excel spreadsheet contains spectral data of all 13283 colour tones of the HLC Colour Atlas XL.

A. Measurement Report

On a reference atlas of the first series, all 13283 HLC colour tones were measured spectrophotometrically with a measuring instrument X-Rite i1 Pro two months after production. The resulting Lab colour values show an average DeltaE00 of 0.53 to the respective target colour. Most colour tones are below DeltaE00 = 0.47. The largest deviations from the target exist at the saturated right side of the pages, the maximum deviation from the target colour is 2.17. (The Delta E values and mean values are shown at the right edge and at the bottom of the table).

Evaluation: the conditions of the FOGRA certification for proof printing are fulfilled, and the high print quality compared to the 4C offset printing becomes clear - this with a strongly extended colour space, which also includes 99% of the usual spot colours. 

B. Optimization

The measured spectral data were further optimized by calculation. In an iterative process (Excel solver), each measured spectrum was gradually adapted to the Lab target values.

After 30 executions the result was:
- mean DeltaE00 = 0.000035 to the target value
- Maximum DeltaE00 = 0.009932
- 50% of all spectra are DeltaE00 < 0.000001
- 99% of all spectra are DeltaE00 < 0,000764

Evaluation: The optimized atlas colour spectra lie within a tolerance range that is sufficient for industrial applications of all kinds. Even the largest deviation from the Lab target colour remains so small that it is not perceptible. 

The spectral data of variant B are also provided as CxF file. This file format can be read in in numerous programs. With this the recipe of all colours of the HLC Colour Atlas XL is possible, e.g. as spot printing colour. When using X-Rite InkFormulation, the file should be copied into the folder "C:\Program Files\X-Rite\colourLibraries" in order to avoid a long loading time.


Disclaimer
==========

Despite careful production and extensive testing, it cannot be ruled out that there may be errors in this software which may only occur under certain constellations. We are grateful for any information, liability is not assumed.


Manufacturer, Copyright
=======================

freieFarbe e.V.
Grünteweg 31
26127 Oldenburg
info@freiefarbe.de
www.freiefarbe.de

Coworkers:
Matthias Betz, Holger Everding, Jan-Peter Homann, Peter Jäger, Eric A. Soder

The non-profit freieFarbe e.V. is an association of German and Swiss colour specialists who have set themselves the task of promoting colour communication on the basis of open standards. 

The available data may be freely used and copied in private and commercial surroundings in unchanged form. The author "freieFarbe e.V." must be named.

Creative Commons CC-BY-ND 4.0


Version History
===============

1.2	(2019-01-30)
Correction of color H250_L040_C065 and change of the decimal separator in the CGATS file 

1.1	(2018-12-05)
Correction of the optimized spectral data for 12 colours (maximum remission in a wavelength range limited to 95%; CxF, CGATS, Excel)

1.0	(2018-11-04)
First release

