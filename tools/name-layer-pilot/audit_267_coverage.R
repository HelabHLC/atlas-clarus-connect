# Audit the full ISCC-NBS category coverage of the computed ATLAS Clarus layer.
# This script never changes PKL identity data or Designer Layer assignments.
for (p in c("munsellinterpol", "jsonlite", "digest")) {
  if (!requireNamespace(p, quietly = TRUE)) stop("Missing package: ", p)
}
stopifnot(utils::packageVersion("munsellinterpol") == base::package_version("3.6-0"))

MASTER <- "8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4"
layer_path <- "designer-layer/ATLAS_Clarus_Designer_Layer_Master_v0_1.json"
source_path <- "hover-library/data/colors.json"
out_json <- "designer-layer/ISCC_NBS_267_COVERAGE_AUDIT.json"
out_csv <- "designer-layer/ISCC_NBS_267_CATEGORY_COUNTS.csv"
out_md <- "designer-layer/ISCC_NBS_267_COVERAGE_REPORT.md"

layer <- jsonlite::fromJSON(layer_path, simplifyVector = FALSE)
source <- jsonlite::fromJSON(source_path, simplifyVector = FALSE)
stopifnot(source$master_sha256 == MASTER, source$entry_count == 13283L)
stopifnot(layer$source_master$sha256 == MASTER, length(layer$records) == 13283L)

ids <- vapply(layer$records, function(x) as.integer(x$atlas_row_id), integer(1))
refs <- vapply(layer$records, function(x) as.character(x$reference), character(1))
numbers <- vapply(layer$records, function(x) as.integer(x$standard_name_number), integer(1))
hvc <- t(vapply(layer$records, function(x) as.numeric(unlist(x$munsell_hvc)), numeric(3)))
lab <- t(vapply(source$colors, function(x) as.numeric(unlist(x$lab)), numeric(3)))
stopifnot(identical(ids, 0:13282), !anyDuplicated(refs), all(is.finite(hvc)), all(is.finite(lab)))

centroids <- munsellinterpol::CentroidsISCCNBS
stopifnot(nrow(centroids) == 267L, identical(as.integer(centroids$Number), 1:267))
centroid_hvc <- munsellinterpol::HVCfromMunsellName(centroids$MunsellSpec)
centroid_blocks <- suppressWarnings(munsellinterpol::ColorBlockFromMunsell(centroid_hvc))
stopifnot(identical(as.integer(centroid_blocks$Number), 1:267))

# Reclassify every stored HVC independently of the saved category fields.
reclassified <- suppressWarnings(munsellinterpol::ColorBlockFromMunsell(hvc))
stopifnot(!anyNA(reclassified$Number), identical(as.integer(reclassified$Number), numbers))

counts <- tabulate(numbers, nbins = 267L)
category_table <- data.frame(
  number = 1:267,
  name = tools::toTitleCase(tolower(as.character(centroids$Name))),
  atlas_reference_count = counts,
  coverage_status = ifelse(counts > 0L, "REPRESENTED", "DEFINED_NOT_SAMPLED"),
  centroid_munsell = as.character(centroids$MunsellSpec),
  stringsAsFactors = FALSE
)
utils::write.csv(category_table, out_csv, row.names = FALSE, fileEncoding = "UTF-8")

missing_numbers <- which(counts == 0L)
centroid_lab <- suppressWarnings(munsellinterpol::MunsellToLab(
  centroid_hvc[missing_numbers, , drop = FALSE], white = "D50", adapt = "Bradford",
  xyC = "NBS", hcinterp = "bicubic", vinterp = "cubic", VfromY = "ASTM"
))

# Delta E 76 is used only to identify a nearby Atlas reference for human review.
# It does not assign the ISCC-NBS category; ColorBlockFromMunsell does that.
nearest_one <- function(i) {
  d <- sqrt(rowSums((lab - matrix(centroid_lab[i, ], nrow(lab), 3L, byrow = TRUE))^2))
  j <- which.min(d)
  block_table <- get("p.System_ISCCNBS", envir = asNamespace("munsellinterpol"))
  block_rows <- block_table[block_table$Number == missing_numbers[i],
                            c("Hmin", "Hmax", "Vmin", "Vmax", "Cmin", "Cmax"), drop = FALSE]
  list(
    number = as.integer(missing_numbers[i]),
    name = category_table$name[missing_numbers[i]],
    centroid_munsell = as.character(centroids$MunsellSpec[missing_numbers[i]]),
    centroid_hvc = as.numeric(centroid_hvc[missing_numbers[i], ]),
    centroid_lab_d50 = as.numeric(centroid_lab[i, ]),
    centroid_self_classification_verified = TRUE,
    defining_blocks = unname(split(block_rows, seq_len(nrow(block_rows)))),
    nearest_atlas_reference = list(
      atlas_row_id = ids[j], reference = refs[j], lab_d50 = as.numeric(lab[j, ]),
      munsell_hvc = as.numeric(hvc[j, ]), delta_e_76_to_centroid = unname(d[j]),
      assigned_number = numbers[j], assigned_name = category_table$name[numbers[j]]
    ),
    finding = "CATEGORY_DEFINED_BUT_NO_ATLAS_REFERENCE_FALLS_INSIDE_ITS_MUNSELL_BLOCKS"
  )
}
missing <- lapply(seq_along(missing_numbers), nearest_one)

audit <- list(
  schema = "ATLAS_CLARUS_ISCC_NBS_COVERAGE_AUDIT",
  schema_version = "0.1",
  status = "AUDIT_COMPLETE_LAYER_REMAINS_NOT_RELEASED",
  source_master_sha256 = MASTER,
  designer_layer_sha256 = digest::digest(file = layer_path, algo = "sha256", serialize = FALSE),
  method = list(
    assignment = "Stored Lab D50 -> Munsell HVC -> ColorBlockFromMunsell boundary lookup",
    package = "munsellinterpol 3.6-0",
    category_model = "267 revised ISCC-NBS Munsell color-name blocks",
    centroid_test = "All 267 official centroids reclassify to their own category number",
    full_reclassification_test = "All 13,283 stored HVC values reproduce the saved category number",
    nearest_reference_metric = "CIE 1976 Delta E ab; diagnostic only, never used for assignment"
  ),
  results = list(
    atlas_reference_count = 13283L,
    category_count = 267L,
    represented_category_count = sum(counts > 0L),
    unrepresented_category_count = length(missing_numbers),
    count_sum_verified = sum(counts) == 13283L,
    all_atlas_assignments_reproduced = TRUE,
    all_centroids_self_classify = TRUE,
    unrepresented_numbers = as.integer(missing_numbers)
  ),
  unrepresented_categories = missing
)
jsonlite::write_json(audit, out_json, auto_unbox = TRUE, pretty = TRUE, null = "null", digits = NA)

missing_lines <- vapply(missing, function(x) sprintf(
  "| %d | %s | `%s` | `%s` / %d %s | %.3f |",
  x$number, x$name, x$centroid_munsell, x$nearest_atlas_reference$reference,
  x$nearest_atlas_reference$assigned_number, x$nearest_atlas_reference$assigned_name,
  x$nearest_atlas_reference$delta_e_76_to_centroid
), character(1))

report <- c(
  "# ISCC-NBS 267-category coverage audit",
  "",
  "**Status:** audit complete; Designer Layer remains `NOT_RELEASED`.",
  "",
  sprintf("The 13,283 ATLAS Clarus references represent **%d of 267** revised ISCC-NBS categories. **%d categories are defined by the standard but are not sampled by the Atlas grid.**", sum(counts > 0L), length(missing_numbers)),
  "",
  "This is not a requirement that every standard category must occur. ISCC-NBS categories are unequal three-dimensional Munsell blocks; they are not 267 equal sectors of an HLC wheel.",
  "",
  "## Unrepresented standard categories",
  "",
  "| No. | ISCC-NBS name | Official centroid | Nearest Atlas reference / actual category | Delta E 76* |",
  "|---:|---|---|---|---:|",
  missing_lines,
  "",
  "\\* Delta E 76 is a review aid only. Category assignment uses the official Munsell block boundaries.",
  "",
  "## Verification",
  "",
  "- All 13,283 saved assignments were independently reproduced from their stored Munsell HVC values.",
  "- All 267 official category centroids classified back to their own ISCC-NBS number.",
  "- Category counts sum to 13,283.",
  "- No missing name was forced onto an Atlas reference.",
  "- PKL identity values and the existing Designer Layer records were not modified.",
  "",
  "See `ISCC_NBS_267_COVERAGE_AUDIT.json` for exact block boundaries and nearest-reference evidence, and `ISCC_NBS_267_CATEGORY_COUNTS.csv` for all category counts."
)
writeLines(report, out_md, useBytes = TRUE)

