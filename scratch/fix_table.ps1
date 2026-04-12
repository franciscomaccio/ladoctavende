$path = 'src/pages/AdminDashboard.tsx'
$content = Get-Content -Raw -Path $path

$target = @"
                                                    <td style={{ padding: '1rem' }}>{/* NOOP */}</td>
                                                     <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                         <div title={business.type === 'classified' ? 'Clasificado' : 'Negocio'} style={{ display: 'flex', justifyContent: 'center' }}>
                                                             {business.type === 'classified' ? <ShoppingBag size={18} color="#1e3a8a" /> : <Home size={18} color="#009b3a" />}
                                                         </div>
                                                     </td>
                                                     <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                         <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                                             {business.category.split(',').map((cat, idx) => (
                                                                 <span key={idx} title={cat.trim()} style={{ fontSize: '1.2rem', cursor: 'help' }}>
                                                                     {CATEGORY_ICONS[cat.trim()] || '✨'}
                                                                 </span>
                                                             ))}
                                                         </div>
                                                     </td><td style={{ border: 'none', display: 'none' }}>
"@

$replacement = @"
                                                     <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                         <div title={business.type === 'classified' ? 'Clasificado' : 'Negocio'} style={{ display: 'flex', justifyContent: 'center' }}>
                                                             {business.type === 'classified' ? <ShoppingBag size={18} color="#1e3a8a" /> : <Home size={18} color="#009b3a" />}
                                                         </div>
                                                     </td>
                                                     <td style={{ padding: '1rem', textAlign: 'center' }}>
                                                         <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                                                             {business.category.split(',').map((cat, idx) => (
                                                                 <span key={idx} title={cat.trim()} style={{ fontSize: '1.2rem', cursor: 'help' }}>
                                                                     {CATEGORY_ICONS[cat.trim()] || '✨'}
                                                                 </span>
                                                             ))}
                                                         </div>
                                                     </td>
"@

# Note: Using -replace with a simplified match if exact string fails due to line endings
$newContent = $content.Replace($target, $replacement)

if ($newContent -eq $content) {
    Write-Host "Exact replace failed, trying with CRLF normalized..."
    $contentNormalized = $content -replace "`r`n", "`n"
    $targetNormalized = $target -replace "`r`n", "`n"
    $newContent = $contentNormalized.Replace($targetNormalized, $replacement)
    if ($newContent -ne $contentNormalized) {
        $newContent = $newContent -replace "`n", "`r`n"
    } else {
        Write-Host "Fallback failed as well."
        exit 1
    }
}

Set-Content -Path $path -Value $newContent -NoNewline
Write-Host "Successfully updated file!"
