import React from 'react';

export const SkeletonCard = ({ className = "" }) => (
  <div className={`bg-slate-800 animate-pulse rounded-3xl ${className}`}></div>
);

export const SkeletonRow = ({ className = "" }) => (
  <div className={`h-12 bg-slate-800/50 animate-pulse rounded-xl w-full ${className}`}></div>
);

export const SkeletonChart = ({ className = "" }) => (
  <div className={`bg-slate-800/40 animate-pulse rounded-3xl h-64 w-full ${className}`}></div>
);
