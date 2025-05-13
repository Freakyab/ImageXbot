import React from "react";

function SpecialKeywords({
  keyword,
  onClick,
}: {
  keyword: string | null | undefined;
  onClick: () => void;
}) {
  if (!keyword) {
    return null;
  }
  return (
    <span
      className="font-bold text-blue-900"
      onClick={onClick}
      style={{ cursor: "pointer" }}>
      {keyword}
    </span>
  );
}

export default SpecialKeywords;
