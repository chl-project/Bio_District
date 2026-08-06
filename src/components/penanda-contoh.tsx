import styles from "./penanda-contoh.module.css";

/**
 * Memisahkan hasil hitungan dari data yang benar-benar diunggah dengan bagian
 * lama yang masih memakai data contoh. Tanpa penanda ini keduanya tampak setara,
 * dan angka karangan bisa terbawa ke keputusan.
 */
export function PenandaContoh({ children }: { children?: React.ReactNode }) {
  return (
    <div className={styles.penanda}>
      <span className={styles.label}>Data contoh</span>
      <span className={styles.teks}>
        {children ?? "Bagian di bawah ini belum tersambung ke data yang Anda unggah."}
      </span>
    </div>
  );
}
