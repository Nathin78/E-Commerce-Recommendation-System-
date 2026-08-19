export function inr(value) {
  const num = Number(value || 0);
  return `\u20B9${num.toLocaleString("en-IN")}`;
}
