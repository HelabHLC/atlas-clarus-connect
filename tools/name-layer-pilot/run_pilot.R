# ATLAS Clarus ISCC-NBS five-reference pilot.
# Separate descriptive layer only; never changes PKL/HLC identity.
stopifnot(packageVersion("munsellinterpol") == package_version("3.6-0"))
for (p in c("munsellinterpol","jsonlite","digest")) {
  if (!requireNamespace(p, quietly=TRUE)) stop("Missing package: ", p)
}

input <- "tools/name-layer-pilot/pilot_input.csv"
d <- read.csv(input, stringsAsFactors=FALSE, check.names=FALSE)
expected_ids <- c(1389L,2722L,2773L,3795L,9212L)
stopifnot(nrow(d)==5L, identical(as.integer(d$source_atlas_row_id), expected_ids))
stopifnot(!anyDuplicated(d$reference), !anyDuplicated(d$source_atlas_row_id))
stopifnot(all(sprintf("H%03d_L%03d_C%03d",d$H,d$L,d$C)==d$reference))
stopifnot(all(sprintf("#%02X%02X%02X",d$R,d$G,d$B)==d$HEX))

fixture <- munsellinterpol::ColorBlockFromMunsell(c("3R 8/3","7.4YR 3/4"))
stopifnot(identical(as.integer(fixture$Number),c(4L,58L)))
stopifnot(identical(tolower(as.character(fixture$Name)),c("light pink","moderate brown")))

settings <- list(xyC="NBS",hcinterp="bicubic",vinterp="cubic",
                 VfromY="ASTM",rtol=1e-8,atol=1e-6,warn=TRUE)
reported <- data.frame(
  source_atlas_row_id=c(2722L,3795L,9212L,1389L,2773L),
  reported_number=c(69L,107L,186L,43L,95L),
  reported_name=c("Deep orange yellow","Moderate olive","Grayish blue",
                  "Moderate reddish brown","Moderate olive brown")
)

classify_one <- function(i) {
  warnings <- character()
  err <- NULL
  hvc <- tryCatch(withCallingHandlers(
    do.call(munsellinterpol::LabToMunsell,
      c(list(Lab=matrix(c(d$lab_L[i],d$lab_a[i],d$lab_b[i]),nrow=1L),
             white="D50",adapt="Bradford"),settings)),
    warning=function(w){warnings<<-c(warnings,conditionMessage(w));invokeRestart("muffleWarning")}),
    error=function(e){err<<-conditionMessage(e);NULL})
  if (is.data.frame(hvc) && "HVC" %in% names(hvc)) hvc <- hvc$HVC
  if (is.data.frame(hvc) && all(c("H","V","C") %in% names(hvc)))
    hvc <- as.matrix(hvc[,c("H","V","C"),drop=FALSE])
  if (is.numeric(hvc) && is.null(dim(hvc)) && length(hvc)==3L) hvc <- matrix(hvc,nrow=1L)
  ok <- is.matrix(hvc) && identical(dim(hvc),c(1L,3L)) && all(is.finite(hvc))
  block <- if(ok) tryCatch(munsellinterpol::ColorBlockFromMunsell(hvc),
                           error=function(e){err<<-conditionMessage(e);NULL}) else NULL
  valid <- is.data.frame(block) && nrow(block)==1L &&
           all(c("Number","Name") %in% names(block)) &&
           !is.na(block$Number[1]) && !is.na(block$Name[1])
  ext <- reported[match(d$source_atlas_row_id[i],reported$source_atlas_row_id),]
  list(
    source_atlas_row_id=as.integer(d$source_atlas_row_id[i]),
    reference=d$reference[i],
    master_lab=list(L=d$lab_L[i],a=d$lab_a[i],b=d$lab_b[i]),
    master_rgb=as.integer(c(d$R[i],d$G[i],d$B[i])),
    master_hex=d$HEX[i],
    master_sha256="8283ab91b10f89ac758d09ecf5fb4d6343536600a06dd468b1cc1ecf4ec747c4",
    hvc=if(ok) as.numeric(hvc[1,]) else NULL,
    computed_number=if(valid) as.integer(block$Number[1]) else NULL,
    computed_name=if(valid) as.character(block$Name[1]) else NULL,
    reported_number=as.integer(ext$reported_number),
    reported_name=ext$reported_name,
    same_as_reported=if(valid) identical(as.integer(block$Number[1]),as.integer(ext$reported_number)) else NULL,
    status=if(valid && length(warnings)==0L && is.null(err))
      "COMPUTED_EXPERIMENTAL_NOT_INDEPENDENTLY_REVIEWED" else "OPEN",
    warnings=unique(warnings),error=err,
    source_identity_status="EXISTING_ID_PRESERVED_NO_RESELECTION",
    public_name_release=FALSE,measured_qc_status="NOT_MEASURED")
}
records <- lapply(seq_len(nrow(d)),classify_one)
dir.create("name-layer-pilot-results",showWarnings=FALSE)
result <- list(
  name_layer_version="0.2-pilot",
  status="COMPUTED_EXPERIMENTAL_CANDIDATES_NOT_RELEASED",
  records_processed=5L,total_master_records=13283L,
  classification_rule="ColorBlockFromMunsell(full-precision HVC); no centroid matching",
  source_white="D50",target_white="C",adaptation="Bradford",
  package_versions=list(munsellinterpol=as.character(packageVersion("munsellinterpol"))),
  automatic_publication=FALSE,records=records)
json_path <- "name-layer-pilot-results/ATLAS_Name_Pilot_Candidates_NOT_RELEASED.json"
jsonlite::write_json(result,json_path,auto_unbox=TRUE,pretty=TRUE,null="null",digits=NA)
out <- do.call(rbind,lapply(records,function(x)data.frame(
  source_atlas_row_id=x$source_atlas_row_id,reference=x$reference,
  computed_number=if(is.null(x$computed_number)) NA_integer_ else x$computed_number,
  computed_name=if(is.null(x$computed_name)) "" else x$computed_name,
  reported_number=x$reported_number,reported_name=x$reported_name,
  same_as_reported=if(is.null(x$same_as_reported)) NA else x$same_as_reported,
  status=x$status,HEX=x$master_hex,stringsAsFactors=FALSE)))
write.csv(out,"name-layer-pilot-results/ATLAS_Name_Pilot_Candidates_NOT_RELEASED.csv",row.names=FALSE,na="")
writeLines(capture.output(sessionInfo()),"name-layer-pilot-results/R_sessionInfo.txt")
writeLines(paste(digest::digest(file=json_path,algo="sha256",serialize=FALSE),basename(json_path)),
           "name-layer-pilot-results/SHA256_CANDIDATE_JSON.txt")
if(any(vapply(records,function(x)x$status=="OPEN",logical(1)))) quit(status=2L)
