import Link from "next/link";
import { notFound } from "next/navigation";
import { products } from "../../../data/products";

export const dynamicParams = false;

export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const product = products.find((entry) => entry.slug === slug);

  if (!product) {
    return { title: "Product not found | nMATIX Technologies" };
  }

  return {
    title: `${product.name} | nMATIX Technologies`,
    description: product.metaDescription,
  };
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = products.find((entry) => entry.slug === slug);

  if (!product) notFound();

  const statusLabel = product.status === "available" ? "Available" : "Coming soon";

  return (
    <main className="container product-page">
      <article className="product-card">
        <p className={`product-status status-${product.status}`}>{statusLabel}</p>
        <h1>{product.name}</h1>
        <p className="product-tagline">{product.tagline}</p>
        <p className="product-description">{product.shortDescription}</p>
        <Link className="product-cta" href={product.ctaLink}>
          {product.ctaLabel}
        </Link>
      </article>
    </main>
  );
}
