<?php
require 'config.php';
require_login();

$patient_code = $_GET['code'] ?? '';
if (!$patient_code) {
    die('كود المريض غير موجود');
}

// جلب بيانات المريض
$stmt = $pdo->prepare("SELECT * FROM patients WHERE code = ?");
$stmt->execute([$patient_code]);
$patient = $stmt->fetch();

if (!$patient) {
    die('المريض غير موجود');
}

// جلب خدمات المريض
$stmt = $pdo->prepare("SELECT * FROM patient_services WHERE patient_code = ?");
$stmt->execute([$patient_code]);
$services = $stmt->fetchAll();

// جلب الملفات
$stmt = $pdo->prepare("SELECT * FROM patient_files WHERE patient_code = ? ORDER BY uploaded_at DESC");
$stmt->execute([$patient_code]);
$files = $stmt->fetchAll();

// حساب الإجماليات
$accommodation = $patient['accommodation_price'] ?? 0;
$servicesTotal = 0;
foreach ($services as $s) {
    $servicesTotal += $s['price'] * $s['quantity'];
}
$totalPaid = ($patient['entry_payment'] ?? 0) + ($patient['paid_amount'] ?? 0);
$due = max(0, $accommodation + $servicesTotal - $totalPaid);

// رفع ملف جديد
$message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['patient_file'])) {
    if ($_FILES['patient_file']['error'] === 0) {
        $file = $_FILES['patient_file'];
        $originalName = $file['name'];
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        $newName = $patient_code . '_' . time() . '.' . $ext;
        $target = 'uploads/patient_files/' . $newName;

        if (move_uploaded_file($file['tmp_name'], $target)) {
            $stmt = $pdo->prepare("INSERT INTO patient_files (patient_code, file_name, file_path, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$patient_code, $originalName, $target, $file['type'], $_SESSION['username']]);
            $message = '<p style="color:#00ffaa;">تم رفع الملف بنجاح</p>';
            header("Refresh:0"); // إعادة تحميل الصفحة
        } else {
            $message = '<p style="color:red;">خطأ في رفع الملف</p>';
        }
    }
}

// حذف ملف
if (isset($_GET['delete_file'])) {
    $file_id = $_GET['delete_file'];
    $stmt = $pdo->prepare("SELECT file_path FROM patient_files WHERE id = ? AND patient_code = ?");
    $stmt->execute([$file_id, $patient_code]);
    $file = $stmt->fetch();
    if ($file && unlink($file['file_path'])) {
        $stmt = $pdo->prepare("DELETE FROM patient_files WHERE id = ?");
        $stmt->execute([$file_id]);
    }
    header("Location: patient_details.php?code=$patient_code");
    exit;
}
?>

<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تفاصيل المريض - <?php echo $patient['code']; ?></title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
<div class="container">
    <div class="header">
        <img src="2.jpg" alt="مستشفى ابوالعزايم">
        <h1>تفاصيل المريض: <?php echo $patient['name'] ?? 'غير معروف'; ?> (كود: <?php echo $patient['code']; ?>)</h1>
    </div>

    <div class="box">
        <h2 style="color:#ff8c00;">بيانات المريض</h2>
        <p><strong>الاسم:</strong> <?php echo $patient['name']; ?></p>
        <p><strong>رقم الغرفة:</strong> <?php echo $patient['room_number']; ?></p>
        <p><strong>نوع الحالة:</strong> <?php echo $patient['case_type']; ?></p>
        <p><strong>نوع الغرفة:</strong> <?php echo $patient['room_level']; ?></p>
        <p><strong>تاريخ الدخول:</strong> <?php echo $patient['entry_date']; ?></p>

        <h2 style="color:#ff8c00;">الحسابات المالية</h2>
        <p><strong>سعر الإقامة:</strong> <?php echo $accommodation; ?> جنيه</p>
        <p><strong>إجمالي الخدمات:</strong> <?php echo $servicesTotal; ?> جنيه</p>
        <p><strong>المدفوع:</strong> <?php echo $totalPaid; ?> جنيه</p>
        <p><strong>المستحق:</strong> <span style="color:<?php echo $due > 0 ? 'red' : 'green'; ?>;font-weight:bold;"><?php echo $due; ?> جنيه</span></p>

        <h2 style="color:#ff8c00;">رفع ملفات جديدة (تحاليل، أشعة، تقارير...)</h2>
        <form method="POST" enctype="multipart/form-data">
            <input type="file" name="patient_file" required>
            <button type="submit">رفع الملف</button>
        </form>
        <?php echo $message; ?>

        <h2 style="color:#ff8c00;">الملفات المرفوعة</h2>
        <?php if (empty($files)): ?>
            <p>لا يوجد ملفات مرفوعة بعد</p>
        <?php else: ?>
            <table>
                <thead>
                    <tr>
                        <th>اسم الملف</th>
                        <th>تاريخ الرفع</th>
                        <th>رفعه</th>
                        <th>إجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($files as $file): ?>
                        <tr>
                            <td><?php echo htmlspecialchars($file['file_name']); ?></td>
                            <td><?php echo $file['uploaded_at']; ?></td>
                            <td><?php echo $file['uploaded_by']; ?></td>
                            <td>
                                <a href="<?php echo $file['file_path']; ?>" target="_blank">عرض / تحميل</a>
                                <?php if ($_SESSION['role'] === 'admin'): ?>
                                    | <a href="?code=<?php echo $patient_code; ?>&delete_file=<?php echo $file['id']; ?>" 
                                       onclick="return confirm('تأكيد الحذف؟')">حذف</a>
                                <?php endif; ?>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php endif; ?>

        <br>
        <button onclick="window.history.back()">رجوع</button>
        <a href="dashboard.php"><button>اللوحة الرئيسية</button></a>
    </div>
</div>
</body>
</html>