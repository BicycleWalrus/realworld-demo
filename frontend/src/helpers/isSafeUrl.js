function isSafeUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

export default isSafeUrl;
